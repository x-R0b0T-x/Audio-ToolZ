import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {overviewRange,kickPulseAt} from './useOverviewNavigation';
test('overview pan preserves zoom and clamps at both ends',()=>{
 assert.deepEqual(overviewRange(1000,350,100),[350,450]);
 assert.deepEqual(overviewRange(1000,-10,100),[0,100]);
 assert.deepEqual(overviewRange(1000,990,100),[900,1000]);
 assert.deepEqual(overviewRange(32,0,64),[0,32]);
});
test('robot follows irregular detected kick positions rather than a free BPM clock',()=>{
 const kicks=[1000,25000,53000];
 assert.equal(kickPulseAt(999,48000,kicks),0);
 assert.equal(kickPulseAt(1000,48000,kicks),1);
 assert.equal(kickPulseAt(25000,48000,kicks),1);
 assert.equal(kickPulseAt(49000,48000,kicks),0);
 assert.equal(kickPulseAt(53000,48000,kicks),1);
 assert.equal(kickPulseAt(1000,48000,[]),0);
 assert.equal(kickPulseAt(1000,48000,kicks),1);
});
test('overview is connected and never calls selection or engine commands',()=>{
 const code=readFileSync('src/utils/useOverviewNavigation.ts','utf8');
 assert.ok(!code.includes('onSelectionChange'));
 assert.ok(!code.includes('audioEngine'));
 assert.ok(code.includes('e.button!==2'));
 assert.ok(code.includes("'grabbing'"));
 assert.ok(readFileSync('src/components/WaveformView.tsx','utf8').includes('useOverviewNavigation({canvas:overviewCanvasRef'));
 const sync=readFileSync('src/utils/finalUi.ts','utf8');
 assert.ok(sync.includes('kickPulseAt(audioEngine.getCurrentSample(),rate,kicks)'));
});
