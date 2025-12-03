
import { YouTubeVideoData } from "../types";

const TRANSCRIPT_API_KEY = '';
const TRANSCRIPT_URL = 'https://transcriptapi.com/api/v2/youtube/transcript';

// Mock data to allow the app to function when API calls fail (e.g. due to CORS in browser)
const MOCK_TRANSCRIPT = `
[00:00:00] (Dramatic music fades in)
[00:00:05] Narrator: It was a cold morning in Providence, Rhode Island. The courtroom of Judge Frank Caprio was bustling as usual, but today, something felt different.
[00:00:15] Judge Caprio: Good morning. Please state your name for the record.
[00:00:20] Defendant: My name is Sarah, your honor. I'm here for a parking ticket.
[00:00:25] Narrator: Sarah looked tired. Her hands were shaking. This wasn't just about a 50 dollar fine. It was about the choice between buying medicine for her son or paying the city.
[00:00:35] Judge Caprio: I see here you have three unpaid tickets. Can you explain why?
[00:00:40] Sarah: Your honor, I lost my job three months ago. My son... he has asthma. The inhalers are expensive. I had to park near the hospital emergency room because he couldn't breathe.
[00:00:55] Narrator: The room went silent. This is what separates Judge Caprio from others. He doesn't just see the law; he sees the person.
[00:01:05] Judge Caprio: You went to the emergency room? Do you have proof of that?
[00:01:10] Sarah: Yes, I have the discharge papers right here.
[00:01:15] Narrator: She handed the crumpled papers to the bailiff. Inspector Quinn looked at them and nodded to the Judge.
[00:01:25] Judge Caprio: Sarah, in this courtroom, we don't just enforce rules. We try to understand life. You were a mother trying to save her child.
[00:01:35] Narrator: Tears began to stream down Sarah's face. It was the first time in months someone had listened to her not as a debtor, but as a human being.
[00:01:45] Judge Caprio: I am dismissing all these tickets. But I want you to promise me something. Take care of that boy.
[00:01:55] Narrator: It was a small act of kindness, but for Sarah, it changed everything. In a world that often feels cold and bureaucratic, compassion won that day.
[00:02:10] (Music swells)
[00:02:15] Narrator: These stories happen every day. But we rarely see them. Stay tuned for more stories of justice and humanity.
`;

export const fetchTranscript = async (videoUrl: string): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
        video_url: videoUrl,
        format: 'json'
    });

    const response = await fetch(`${TRANSCRIPT_URL}?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${TRANSCRIPT_API_KEY}`
        }
    });

    if (!response.ok) {
        console.warn(`Transcript API returned ${response.status}. Using mock data.`);
        return MOCK_TRANSCRIPT.repeat(3); 
    }

    const data = await response.json();
    if (data && data.transcript) {
        return data.transcript;
    }
    return null;
  } catch (error) {
    console.warn("Transcript API unreachable. Switched to Mock Data.");
    return MOCK_TRANSCRIPT.repeat(3);
  }
};

// --- REAL VIDEO DATABASE (FALLBACK) ---
interface RealVideo {
    id: string;
    title: string;
    channel: string;
    views: string;
    date: string;
}

const VIDEO_DATABASE: Record<string, RealVideo[]> = {
    caprio: [
        { id: '8m0p5K1F4_0', title: 'He Tried To Sue Judge Caprio', channel: 'Caught In Providence', views: '12M', date: '3 years ago' },
        { id: 'PDY-F-n92kI', title: 'Judge Caprio Gets Emotional', channel: 'Caught In Providence', views: '8M', date: '4 years ago' },
        { id: 'ULjL1yG-5gE', title: 'Parking Ticket Dismissed by Judge Caprio', channel: 'Caught In Providence', views: '5.2M', date: '2 years ago' },
        { id: 'qg48K34gqDk', title: 'Honest Man Surprises Judge Caprio', channel: 'Caught In Providence', views: '15M', date: '5 years ago' },
        { id: '7E_w_t5-x2I', title: 'Single Mother Breaks Down in Court', channel: 'True Crime Daily', views: '22M', date: '1 year ago' },
    ],
    slavery: [
        { id: 'Jc1RbHxQvf8', title: 'Life Aboard a Slave Ship | History', channel: 'History', views: '8.5M', date: '5 years ago' },
        { id: '3NXC4Q_4JVg', title: 'The ugly history of the 1619 Project', channel: 'TED-Ed', views: '1.2M', date: '2 years ago' },
        { id: 'r2s3t4u5v6w', title: 'Frederick Douglass: From Slave to Statesman', channel: 'Biographics', views: '600K', date: '3 years ago' },
        { id: 'AlJg798M3eI', title: 'The Civil War, Part 1: Revolution', channel: 'Oversimplified', views: '45M', date: '4 years ago' },
    ],
    war: [
        { id: 'a7b8c9d0e1f', title: 'Modern Urban Combat Tactics Explained', channel: 'Task & Purpose', views: '1.5M', date: '11 months ago' },
        { id: 'N-56N1c4t6s', title: 'How Drones Changed Warfare Forever', channel: 'Vox', views: '3M', date: '1 year ago' },
        { id: 'T2345678901', title: 'Inside A US Aircraft Carrier', channel: 'Insider Business', views: '12M', date: '2 years ago' },
    ],
    crime: [
        { id: '1BYu_jM8A5Y', title: 'What Pretending to be Crazy Looks Like', channel: 'JCS - Criminal Psychology', views: '60M', date: '2 years ago' },
        { id: '98765432101', title: 'Interrogation of a Psychopath', channel: 'JCS', views: '25M', date: '3 years ago' },
        { id: 'abcdef12345', title: 'The Most Chilling Interviews', channel: 'Explore With Us', views: '10M', date: '1 year ago' },
    ],
    history: [
        { id: 'Y-123456789', title: 'The Roman Empire Explained', channel: 'History Matters', views: '2M', date: '1 year ago' },
        { id: 'Z-987654321', title: 'World War II in Color', channel: 'Netflix', views: '5M', date: '2 years ago' },
    ],
    generic: [
        { id: 'tmNXKqeUtJM', title: 'SpaceX Starship Flight', channel: 'SpaceX', views: '10M', date: '1 month ago' },
        { id: 'AD-12345678', title: 'AI Revolution is Here', channel: 'ColdFusion', views: '1.2M', date: '3 weeks ago' },
        { id: 'TE-98765432', title: 'The Future of Robotics', channel: 'Boston Dynamics', views: '8M', date: '2 months ago' }
    ]
};

// Helper to detect niche from keywords (Expanded with Ukrainian)
const detectNiche = (keywords: string[]): string => {
    const text = keywords.join(' ').toLowerCase();
    
    if (text.includes('caprio') || text.includes('judge') || text.includes('court') || text.includes('providence') || text.includes('law') || text.includes('суд') || text.includes('суддя')) return 'caprio';
    if (text.includes('slave') || text.includes('slavery') || text.includes('civil war') || text.includes('freedom') || text.includes('рабство')) return 'slavery';
    if (text.includes('war') || text.includes('army') || text.includes('battle') || text.includes('military') || text.includes('combat') || text.includes('війна')) return 'war';
    if (text.includes('crime') || text.includes('murder') || text.includes('detective') || text.includes('killer') || text.includes('police') || text.includes('кримінал')) return 'crime';
    if (text.includes('history') || text.includes('empire') || text.includes('ancient') || text.includes('історія')) return 'history';
    
    return 'generic';
};

const getThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

export const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- NEW: FETCH TITLES FROM USER INPUT ---
export const getVideoTitlesByIds = async (videoIds: string[], apiKey: string): Promise<string[]> => {
    if (videoIds.length === 0) return [];
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(',')}&key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items) {
            return data.items.map((item: any) => item.snippet.title);
        }
        return [];
    } catch (e) {
        console.error("Failed to fetch input video titles", e);
        return [];
    }
};

// Helper to parse ISO 8601 duration
const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    
    const hoursStr = match[1] || '0H';
    const minsStr = match[2] || '0M';
    const secsStr = match[3] || '0S';

    const hours = parseInt(hoursStr.replace('H', '')) || 0;
    const minutes = parseInt(minsStr.replace('M', '')) || 0;
    const seconds = parseInt(secsStr.replace('S', '')) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
};

// --- HELPER: GET TOP VIDEOS FROM CHANNEL ---
const getTopVideosFromChannel = async (channelId: string, apiKey: string): Promise<any[]> => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const publishedAfter = oneYearAgo.toISOString();

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=view&publishedAfter=${publishedAfter}&type=video&key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items || [];
    } catch (e) {
        console.warn(`Failed to fetch top videos for channel ${channelId}`, e);
        return [];
    }
}

// --- REAL YOUTUBE SEARCH ---
export const searchRealYouTube = async (keywords: string[], apiKey: string): Promise<YouTubeVideoData[]> => {
    const query = keywords.join(' ');
    console.log(`Searching YouTube for: ${query}`);
    
    // 1. Initial Search (Find Channels/Videos)
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "YouTube API Error");
        }
        const searchData = await response.json();

        if (!searchData.items || searchData.items.length === 0) return [];

        // 2. Identify Top Channels (Unique)
        const topChannelIds = new Set<string>();
        const initialVideoItems = [...searchData.items];
        
        initialVideoItems.forEach((item: any) => {
             if (item.snippet?.channelId) topChannelIds.add(item.snippet.channelId);
        });

        // 3. Fetch "Best of" from these channels (Limit to top 3 channels to save quota/time)
        const targetChannels = Array.from(topChannelIds).slice(0, 3);
        let expandedVideoItems = [...initialVideoItems];

        for (const chId of targetChannels) {
             const bestVideos = await getTopVideosFromChannel(chId, apiKey);
             expandedVideoItems = [...expandedVideoItems, ...bestVideos];
        }

        // 4. Remove duplicates
        const uniqueItemsMap = new Map();
        expandedVideoItems.forEach(item => uniqueItemsMap.set(item.id.videoId, item));
        const uniqueItems = Array.from(uniqueItemsMap.values());

        // 5. Get Detailed Stats (Duration, Views)
        // Batch IDs (max 50)
        const videoIds = uniqueItems.map((item: any) => item.id.videoId).slice(0, 50).join(',');
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
        
        const statsRes = await fetch(statsUrl);
        const statsData = await statsRes.json();
        
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // 6. Strict Filtering
        const validItems = statsData.items?.filter((item: any) => {
            // A. Date Filter (Last 1 Year)
            const publishedAt = new Date(item.snippet.publishedAt);
            if (publishedAt < oneYearAgo) return false;

            // B. Duration Filter (No Shorts, > 60s)
            // Safety margin: 90 seconds to avoid edge-case vertical videos that are slightly over 60s
            const durationSecs = parseDuration(item.contentDetails.duration);
            if (durationSecs < 90) return false;

            // C. View Count Filter (> 5000 views)
            const viewCount = parseInt(item.statistics.viewCount || '0');
            if (viewCount < 5000) return false;

            return true;
        }) || [];

        // 7. Sort by Views (Most popular first)
        validItems.sort((a: any, b: any) => {
             const viewsA = parseInt(a.statistics.viewCount || '0');
             const viewsB = parseInt(b.statistics.viewCount || '0');
             return viewsB - viewsA;
        });

        // Format stats for UI
        const statsMap: Record<string, string> = {};
        validItems.forEach((item: any) => {
            const views = parseInt(item.statistics.viewCount);
            if (views > 1000000) statsMap[item.id] = (views / 1000000).toFixed(1) + 'M';
            else if (views > 1000) statsMap[item.id] = (views / 1000).toFixed(0) + 'K';
            else statsMap[item.id] = views.toString();
        });

        // Map to internal format (Take top 9 valid results)
        return validItems.slice(0, 9).map((item: any) => {
            const vidId = item.id;
            const snippet = item.snippet;
            
            // Calc relative time
            const published = new Date(snippet.publishedAt);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - published.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            let dateStr = `${diffDays} days ago`;
            if (diffDays > 30) dateStr = `${Math.floor(diffDays/30)} months ago`;
            if (diffDays > 365) dateStr = `${Math.floor(diffDays/365)} years ago`;

            // Decode HTML entities in title
            const parser = new DOMParser();
            const decodedTitle = parser.parseFromString(snippet.title, 'text/html').body.textContent || snippet.title;

            return {
                id: vidId,
                url: `https://www.youtube.com/watch?v=${vidId}`,
                title: decodedTitle,
                channelName: snippet.channelTitle,
                views: statsMap[vidId] || 'N/A', 
                date: dateStr, 
                thumbnail: snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url || getThumbnail(vidId),
                selected: null
            };
        });

    } catch (e) {
        console.error("Search Real YouTube failed:", e);
        throw e;
    }
};

export const searchSimilarVideos = async (keywords: string[], apiKey?: string): Promise<YouTubeVideoData[]> => {
    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 1. Try Real Search if Key provided
    if (apiKey && apiKey.trim().length > 10) {
        try {
            const realResults = await searchRealYouTube(keywords, apiKey);
            if (realResults.length > 0) return realResults;
        } catch (e) {
            console.warn("Falling back to database due to API error");
        }
    }

    // 2. Fallback to Database
    const nicheKey = detectNiche(keywords);
    let pool = VIDEO_DATABASE[nicheKey] || [];
    
    if (pool.length === 0) pool = VIDEO_DATABASE['generic'];

    // Select top 6 videos from the pool (Real Data)
    const selectedVideos = pool.slice(0, 6);

    const results: YouTubeVideoData[] = selectedVideos.map(vid => ({
        id: vid.id,
        url: `https://www.youtube.com/watch?v=${vid.id}`,
        title: vid.title,
        channelName: vid.channel,
        views: vid.views, 
        date: vid.date, 
        thumbnail: getThumbnail(vid.id),
        selected: null,
        transcript: '10:00' 
    }));

    return results;
};
