// Live TV & Streaming API Service using TVMaze Public Open API (No key required)
import { samplePrograms } from '../data/tvData';

const BASE_URL = 'https://api.tvmaze.com';

/**
 * Clean up HTML tags from TVMaze summaries
 */
function cleanSummary(html) {
  if (!html) return "Nessuna descrizione disponibile per questo programma.";
  return html.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Determine genre category mapping
 */
function mapGenre(genres, type) {
  if (!genres) genres = [];
  const gStr = genres.join(' ').toLowerCase();
  const tStr = (type || '').toLowerCase();

  if (gStr.includes('movie') || tStr.includes('movie')) return 'movies';
  if (gStr.includes('sport')) return 'sports';
  if (gStr.includes('children') || gStr.includes('family') || gStr.includes('anime')) return 'kids';
  if (gStr.includes('documentary') || tStr.includes('documentary')) return 'docs';
  if (tStr.includes('talk show') || tStr.includes('reality') || tStr.includes('game show') || gStr.includes('comedy')) return 'entertainment';
  return 'series';
}

/**
 * Calculate live progress percentage
 */
function calculateProgress(airtime, runtimeMinutes) {
  if (!airtime) return 0;
  try {
    const [hours, mins] = airtime.split(':').map(Number);
    const now = new Date();
    const showStart = new Date();
    showStart.setHours(hours, mins, 0, 0);

    const runtimeMs = (runtimeMinutes || 60) * 60 * 1000;
    const showEnd = new Date(showStart.getTime() + runtimeMs);

    if (now < showStart) return 0;
    if (now > showEnd) return 100;

    const elapsed = now.getTime() - showStart.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / runtimeMs) * 100)));
  } catch {
    return 35;
  }
}

/**
 * Calculate end time string
 */
function calculateEndTime(airtime, runtimeMinutes) {
  if (!airtime) return "23:00";
  try {
    const [hours, mins] = airtime.split(':').map(Number);
    const totalMins = hours * 60 + mins + (runtimeMinutes || 60);
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return "23:30";
  }
}

/**
 * Fetch Live TV Schedule for a specific country from TVMaze API
 */
export async function fetchLiveSchedule(countryCode = 'IT') {
  try {
    const response = await fetch(`${BASE_URL}/schedule?country=${countryCode}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API response failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No API results for country ${countryCode}, falling back to local database.`);
      return samplePrograms.filter(p => p.country === countryCode);
    }

    // Process & map TVMaze items to CineGuide standard schema
    const liveItems = data.slice(0, 30).map((item, index) => {
      const show = item.show || {};
      const network = show.network || show.webChannel || {};
      const networkName = network.name || "Canale Nazionale";
      const airtime = item.airtime || "21:15";
      const runtime = item.runtime || 60;
      const progress = calculateProgress(airtime, runtime);

      const ratingScore = show.rating && show.rating.average ? (show.rating.average / 2).toFixed(1) : (4.0 + (index % 10) * 0.1).toFixed(1);

      return {
        id: `tvmaze-${item.id || index}`,
        tvmazeShowId: show.id,
        country: countryCode,
        channelId: networkName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || "rai1",
        channelName: networkName,
        channelLogo: show.image?.medium || `https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&auto=format&fit=crop&q=80`,
        title: show.name || item.name || "Programma TV",
        originalTitle: show.name || "",
        genre: mapGenre(show.genres, show.type),
        rating: parseFloat(ratingScore),
        votesCount: (1200 + index * 140),
        startTime: airtime,
        endTime: calculateEndTime(airtime, runtime),
        timeSlot: airtime < "12:00" ? "morning" : airtime < "18:00" ? "afternoon" : airtime < "22:30" ? "primeTime" : "lateNight",
        durationMinutes: runtime,
        progressPercentage: progress,
        isLive: progress > 0 && progress < 100,
        posterUrl: show.image?.original || show.image?.medium || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
        bannerUrl: show.image?.original || "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&auto=format&fit=crop&q=80",
        synopsis: cleanSummary(show.summary || item.summary),
        cast: "Cast Ufficiale Inclusione TVMaze",
        director: "Produzione Network " + networkName,
        year: show.premiered ? show.premiered.slice(0, 4) : "2024",
        ageRating: show.rating?.average > 8 ? "14+" : "T",
        streamingProviders: show.webChannel ? [show.webChannel.name] : ["RaiPlay", "Netflix", "Prime Video"],
        upcomingEpisodes: [],
        reviews: [
          {
            id: `rev-live-${index}`,
            user: "Spettatore Live",
            avatar: `https://i.pravatar.cc/100?img=${(index % 50) + 1}`,
            rating: Math.min(5, Math.max(3, Math.round(parseFloat(ratingScore)))),
            text: `In onda su ${networkName}! Ottima qualità di trasmissione.`,
            date: "Oggi in diretta",
            helpful: 12 + index
          }
        ]
      };
    });

    // Merge fallback local items if live list is small
    const localItems = samplePrograms.filter(p => p.country === countryCode);
    return [...liveItems, ...localItems];
  } catch (err) {
    console.error("Error fetching live schedule from API:", err);
    // Fallback to sample local programs
    return samplePrograms.filter(p => p.country === countryCode);
  }
}

/**
 * Search Shows in Real Time via TVMaze API
 */
export async function searchLiveShows(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item, idx) => {
      const show = item.show || {};
      const network = show.network || show.webChannel || {};
      return {
        id: `search-${show.id || idx}`,
        tvmazeShowId: show.id,
        country: network.country?.code || "IT",
        channelId: (network.name || "Tv").toLowerCase().replace(/[^a-z0-9]/g, ''),
        channelName: network.name || "Streaming TV",
        channelLogo: show.image?.medium || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&auto=format&fit=crop&q=80",
        title: show.name,
        originalTitle: show.name,
        genre: mapGenre(show.genres, show.type),
        rating: show.rating?.average ? (show.rating.average / 2) : 4.5,
        votesCount: 850,
        startTime: "21:15",
        endTime: "22:30",
        durationMinutes: show.runtime || 60,
        progressPercentage: 40,
        isLive: true,
        posterUrl: show.image?.medium || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
        bannerUrl: show.image?.original || "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&auto=format&fit=crop&q=80",
        synopsis: cleanSummary(show.summary),
        cast: "Cast Serie TV Ufficiale",
        year: show.premiered ? show.premiered.slice(0, 4) : "2024",
        streamingProviders: show.webChannel ? [show.webChannel.name] : ["Netflix", "Prime Video"],
        reviews: []
      };
    });
  } catch (e) {
    console.error("Search API error:", e);
    return [];
  }
}

/**
 * Fetch detailed cast members for a show
 */
export async function fetchShowCast(showId) {
  if (!showId) return null;
  try {
    const res = await fetch(`${BASE_URL}/shows/${showId}/cast`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.slice(0, 5).map(c => c.person?.name).join(', ');
  } catch {
    return null;
  }
}
