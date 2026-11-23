export type RobotBounds={left:number;top:number;width:number;height:number};
export type RobotFit={size:number;dx:number;dy:number;ox:number;oy:number;room:number};
export const ROBOT_PULSE_SCALE:number;
export function alphaBounds(data:ArrayLike<number>,width:number,height:number,threshold?:number):RobotBounds;
export function fitRobot(bounds:RobotBounds,targetHeight:number,slotWidth:number,pulse?:number):RobotFit;
