export async function playEasterMedia(video,audio){video.muted=true;video.loop=true;audio.loop=true;audio.volume=.4;await Promise.all([video.play(),audio.play()]);}
export function stopEasterMedia(...elements){for(const media of elements){media.pause();media.removeAttribute('src');media.load();}}
