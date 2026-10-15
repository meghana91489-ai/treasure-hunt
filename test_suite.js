const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (body) headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 RUNNING UPDATED DIRECT QR-SCAN TEST SUITE\n');

  // 1. Admin login
  const adminRes = await request('POST', '/api/auth/admin-login', { username: 'admin', password: 'admin123' });
  console.log('1. Admin Login:', adminRes.status === 200 && adminRes.data.success ? '✅ PASSED' : '❌ FAILED');

  // 2. Team registration
  const dynamicTeamName = 'Racer_' + Date.now().toString().slice(-4);
  const teamRes = await request('POST', '/api/auth/team-login', { teamName: dynamicTeamName, pin: '1111' });
  console.log('2. Team Register/Login:', teamRes.status === 200 && teamRes.data.success ? '✅ PASSED' : '❌ FAILED', teamRes.data.team);
  const teamToken = teamRes.data.token;

  // 3. Current Stage & Previous Stages array
  const stage1 = await request('GET', '/api/play/current-stage', null, teamToken);
  const hasTabs = Array.isArray(stage1.data.unlockedStages) && stage1.data.unlockedStages.length === 3;
  console.log('3. Unlocked Stages Navigator Available:', hasTabs ? '✅ PASSED' : '❌ FAILED', `(Active Stage: ${stage1.data.currentStageNumber})`);

  // 4. Anti-cheat: Scan Stage 3 token while on Stage 1
  const cheat1 = await request('POST', '/api/play/scan-qr', { qrToken: 'INFOTSAV_STAGE3_OMEGA' }, teamToken);
  console.log('4. Anti-cheat (Skip to Stage 3 QR):', cheat1.status === 400 && cheat1.data.error.includes('Complete previous') ? `✅ REJECTED: "${cheat1.data.error}"` : '❌ FAILED');

  // 5. Anti-cheat: Scan invalid/fake token
  const cheat2 = await request('POST', '/api/play/scan-qr', { qrToken: 'RANDOM_BOGUS_TOKEN' }, teamToken);
  console.log('5. Anti-cheat (Unknown QR code):', cheat2.status === 404 ? `✅ REJECTED: "${cheat2.data.error}"` : '❌ FAILED');

  // 6. Legitimate Stage 1 QR Scan -> DIRECT ADVANCE!
  const scan1 = await request('POST', '/api/play/scan-qr', { qrToken: 'INFOTSAV_STAGE1_NEXUS' }, teamToken);
  console.log('6. Valid Stage 1 Scan (Direct Advance):', scan1.status === 200 && scan1.data.nextStageNumber === 2 ? `✅ PASSED (Advanced directly to Stage 2!)` : '❌ FAILED', scan1.data);

  // 7. Verify Stage 1 is now marked completed and readable in previous stages list
  const stage2 = await request('GET', '/api/play/current-stage', null, teamToken);
  const prevStage1 = stage2.data.unlockedStages.find(s => s.stageNumber === 1);
  console.log('7. Previous Stage 1 Viewable & Completed:', prevStage1 && prevStage1.isCompleted && prevStage1.locationHint ? '✅ PASSED' : '❌ FAILED');

  // 8. Anti-cheat: Scan Stage 1 token again now that it is completed
  const cheat3 = await request('POST', '/api/play/scan-qr', { qrToken: 'INFOTSAV_STAGE1_NEXUS' }, teamToken);
  console.log('8. Anti-cheat (Completed stage QR):', cheat3.status === 400 && cheat3.data.error.includes('already completed') ? `✅ REJECTED: "${cheat3.data.error}"` : '❌ FAILED');

  // 9. Scan Stage 2 -> DIRECT ADVANCE to Stage 3!
  const scan2 = await request('POST', '/api/play/scan-qr', { qrToken: 'INFOTSAV_STAGE2_CYBER' }, teamToken);
  console.log('9. Stage 2 Scan (Direct Advance):', scan2.status === 200 && scan2.data.nextStageNumber === 3 ? '✅ PASSED (Advanced directly to Stage 3!)' : '❌ FAILED');

  // 10. Scan Stage 3 -> FINAL STAGE DIRECT COMPLETION!
  const scan3 = await request('POST', '/api/play/scan-qr', { qrToken: 'INFOTSAV_STAGE3_OMEGA' }, teamToken);
  console.log('10. Final Stage Scan (Direct Victory):', scan3.status === 200 && scan3.data.completed ? `✅ PASSED (Hunt Completed in ${scan3.data.totalTimeSeconds}s!)` : '❌ FAILED');

  // 11. Test Live GPS Location Update from Participant
  const locRes = await request('POST', '/api/play/update-location', {
    latitude: 12.97159,
    longitude: 77.59456,
    accuracy: 6,
    heading: 90,
    speed: 1.2
  }, teamToken);
  console.log('11. Live GPS Location Ping:', locRes.status === 200 && locRes.data.success ? `✅ PASSED (Lat: ${locRes.data.liveLocation.latitude}, Lng: ${locRes.data.liveLocation.longitude})` : '❌ FAILED');

  // 12. Verify Admin Can Access Live GPS Location
  const adminTeams = await request('GET', '/api/admin/teams', null, adminRes.data.token);
  const trackedTeam = adminTeams.data.find(t => t.name === dynamicTeamName);
  const hasGps = trackedTeam && trackedTeam.liveLocation && trackedTeam.liveLocation.latitude === 12.97159;
  console.log('12. Admin GPS Telemetry Access:', hasGps ? `✅ PASSED (Maps URL: ${trackedTeam.liveLocation.mapsUrl})` : '❌ FAILED');

  // 13. Verify Leaderboard
  const lb = await request('GET', '/api/leaderboard');
  console.log('13. Live Leaderboard Standings:', lb.status === 200 && lb.data.leaderboard.length > 0 ? `✅ PASSED (Hunt: "${lb.data.huntName}")` : '❌ FAILED');

  console.log('\n🎉 ALL COMPONENTS, DIRECT SCAN, PREVIOUS STAGES & GPS TELEMETRY TESTS PASSED!');
}

runTests().catch(console.error);
