const fs = require('fs');
const { WebClient } = require('@slack/web-api');

const token = process.env.SLACK_BOT_TOKEN;
const web = new WebClient(token);
const channelId = 'C0AJ7JV4H3P';
const reportUrl = 'https://qa-land.github.io/little-qa/';
const resultsPath = process.env.RESULTS_PATH || (fs.existsSync('./test-results.json') ? './test-results.json' : './results.json');
const testMemoryPath = process.env.TEST_MEMORY_PATH || './test-memory.json';

function stripAnsi(str) {
  return (str || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function generateFailureAnalysis(testName, errorMessage) {
  const msg = stripAnsi(errorMessage);
  const expectedMatch = msg.match(/Expected pattern:\s*(\S+)/);
  const receivedMatch = msg.match(/Received string:\s*"([^"]+)"/);
  const waitingMatch = msg.match(/waiting for ([^\n]+)/);

  let analysis = 'The test failed because ';

  if (expectedMatch && receivedMatch) {
    const expected = expectedMatch[1];
    const received = receivedMatch[1];
    analysis += `it expected the URL to match the pattern ${expected} but the actual URL was ${received}`;

    const suggestedPattern = inferUrlFix(expected, received);
    if (suggestedPattern) {
      analysis += `, indicating a typo in the expected regex pattern which should likely be ${suggestedPattern}`;
    }
    analysis += '.';
  } else if (waitingMatch) {
    analysis += `it timed out waiting for ${waitingMatch[1].trim()}, which was not found on the page.`;
  } else {
    const firstLine = msg.split('\n')[0].replace(/^Error:\s*/, '').trim();
    analysis += firstLine ? firstLine + '.' : 'an assertion failed.';
  }

  return analysis;
}

function inferUrlFix(expected, received) {
  if (received.includes('logged=true') && (expected.includes('logged=ue') || expected.includes('dashboard'))) {
    return '/.*logged=true/';
  }
  return null;
}

function countFailuresInHistory(testName, file, lastN = 5) {
  if (!fs.existsSync(testMemoryPath)) return null;
  try {
    const raw = fs.readFileSync(testMemoryPath, 'utf8');
    const history = JSON.parse(raw);
    if (!Array.isArray(history)) return null;
    const runs = history.slice(-lastN);
    let failures = 0;
    for (const run of runs) {
      for (const suite of run.suites || []) {
        for (const spec of suite.specs || []) {
          const nameMatch = spec.title === testName;
          const fileMatch = file && (spec.file === file || suite.file === file);
          if ((nameMatch || fileMatch) && spec.ok === false) {
            failures++;
            break;
          }
        }
      }
    }
    return { failures, total: runs.length };
  } catch {
    return null;
  }
}

function extractFailuresWithAnalysis(results) {
  const failures = [];
  for (const suite of results.suites || []) {
    for (const spec of suite.specs || []) {
      if (spec.ok === false && spec.tests) {
        for (const test of spec.tests) {
          for (const r of test.results || []) {
            if (r.status === 'failed' && r.error) {
              const analysis = generateFailureAnalysis(spec.title, r.error.message);
              const history = countFailuresInHistory(spec.title, spec.file || suite.file);
              let text = `${spec.title} — ${analysis}`;
              if (history && history.total > 0) {
                text += ` This test has failed in ${history.failures} of the last ${history.total} runs.`;
              }
              failures.push({ name: spec.title, text });
              break;
            }
          }
        }
      }
    }
  }
  return failures;
}

async function sendSlackReport() {
    try {
        if (!fs.existsSync(resultsPath)) {
            console.error(`❌ Error: ${resultsPath} not found. Run 'npx playwright test' first.`);
            return;
        }

        const rawData = fs.readFileSync(resultsPath, 'utf8');
        const results = JSON.parse(rawData);

        const totalTests = results.stats.expected + results.stats.unexpected + results.stats.skipped;
        const passed = results.stats.expected;
        const failed = results.stats.unexpected;
        
        const statusEmoji = failed > 0 ? '🚨' : '✅';
        const statusText = failed > 0 ? '*FAILED*' : '*PASSED*';
        const buttonStyle = failed > 0 ? 'danger' : 'primary';

        const blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": `${statusEmoji} Little-QA Test Results`,
                    "emoji": true
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*Status:* ${statusText}\n*Run by:* GitHub Actions`
                }
            },
            {
                "type": "section",
                "fields": [
                    { "type": "mrkdwn", "text": `*Total Tests:*\n${totalTests}` },
                    { "type": "mrkdwn", "text": `*Passed:*\n${passed}` },
                    { "type": "mrkdwn", "text": `*Failed:*\n${failed}` }
                ]
            }
        ];

        if (failed > 0) {
            const failures = extractFailuresWithAnalysis(results);
            for (const f of failures) {
                blocks.push({
                    type: "section",
                    text: { type: "mrkdwn", text: f.text }
                });
            }
        }

        blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: { type: "plain_text", text: "📊 View Full Report", emoji: true },
                    url: reportUrl,
                    style: buttonStyle,
                    action_id: "view_report"
                }
            ]
        });

        const result = await web.chat.postMessage({
            channel: channelId,
            text: `Test Run Result: ${statusText}`, 
            blocks: blocks
        });

        console.log(`✅ Message sent to Slack: ${result.ts}`);

    } catch (error) {
        console.error('❌ Error sending to Slack:', error);
    }
}

sendSlackReport();