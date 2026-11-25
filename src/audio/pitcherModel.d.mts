export function validatePitcher(channels:Float32Array[],sampleRate:number,speed:number,pitch:number):number;
export function splicePitcher(original:Float32Array[],segment:Float32Array[],start:number,end:number):{channels:Float32Array[];selection:{startSample:number;endSample:number}};
