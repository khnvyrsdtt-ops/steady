'use strict';
// A local packaging checklist, not legal clearance or a promise of App Review.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root,'app/public/release-config.js'),'utf8'),sandbox);
const config = sandbox.window.SteadyRelease;
const checks = [
  ['Publisher name supplied', !!config.publisherName?.trim()],
  ['Real support email supplied', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.supportEmail || '')],
  ['Public HTTPS privacy-policy URL supplied', /^https:\/\/[^\s]+$/.test(config.privacyPolicyUrl || '')],
  ['Public HTTPS support URL supplied', /^https:\/\/[^\s]+$/.test(config.supportUrl || '')],
  ['Standalone Xcode project present', fs.existsSync(path.join(root,'ios/Steady.xcodeproj/project.pbxproj'))],
  ['Privacy manifest present', fs.existsSync(path.join(root,'ios/Steady/PrivacyInfo.xcprivacy'))]
];
for (const [label, passed] of checks) console.log(`${passed ? 'READY' : 'NEEDED'}: ${label}`);
console.log('MANUAL: verify public URLs actually load, developer signing, device/VoiceOver QA, artwork rights, naming clearance, age/privacy answers, screenshots and Apple review.');
if (checks.some(([,passed]) => !passed)) process.exitCode = 1;
