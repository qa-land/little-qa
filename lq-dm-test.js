// const fs = require('fs');

// const slackBotToken = "xoxb-3582468532-10618794260917-qJknfJzYLbiwTaWPx1rd69G7"; 
// const channelId = "C0AJ7JV4H3P"; 

// async function reportToChannel() {
//     try {
//         const data = JSON.parse(fs.readFileSync('./results.json', 'utf8')); 
//         const failures = data.tests.filter(t => t.status !== 'expected');

//         if (failures.length === 0) return;

//         // Build the Block Kit payload
//         const blocks = [
//             {
//                 "type": "header",
//                 "text": { "type": "plain_text", "text": "🃏 Little LQ: Test Failure Report" }
//             },
//             {
//                 "type": "section",
//                 "text": { "type": "mrkdwn", "text": `*Status:* 🚨 *${failures.length} Tests Failed*` }
//             },
//             { "type": "divider" }
//         ];

//         // Add each failure as a section
//         failures.forEach(fail => {
//             blocks.push({
//                 "type": "section",
//                 "text": {
//                     "type": "mrkdwn",
//                     "text": `*Test:* ${fail.name}\n*File:* \`${fail.file}\`\n*Error:* \`Assertion Error\``
//                 }
//             });
//         });

//         // Add a button at the bottom
//         blocks.push({
//             "type": "actions",
//             "elements": [{
//                 "type": "button",
//                 "text": { "type": "plain_text", "text": "View Full Report" },
//                 "url": "https://playwright-report.qabrains.com/", // Replace with your actual report link for the demo!
//                 "style": "danger"
//             }]
//         });

//         const response = await fetch('https://slack.com/api/chat.postMessage', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${slackBotToken}`
//             },
//             body: JSON.stringify({ channel: channelId, blocks: blocks })
//         });

//         const result = await response.json();
//         console.log(result.ok ? "✅ Professional report sent!" : `❌ Error: ${result.error}`);

//     } catch (err) {
//         console.error("❌ Error:", err.message);
//     }
// }

// reportToChannel();

const fs = require('fs');
const { WebClient } = require('@slack/web-api');

// 1. Configuration
const token = process.env.SLACK_BOT_TOKEN
const web = new WebClient(token);
const channelId = 'C0AJ7JV4H3P'; // Your Little-QA channel ID
const reportUrl = 'https://qa-land.github.io/little-qa/'; // Your live GitHub Pages link
const resultsPath = './results.json';

async function sendSlackReport() {
    try {
        // 2. Check if results file exists to avoid ENOENT errors
        if (!fs.existsSync(resultsPath)) {
            console.error(`❌ Error: ${resultsPath} not found. Run 'npx playwright test' first.`);
            return;
        }

        // 3. Parse the Playwright results
        const rawData = fs.readFileSync(resultsPath, 'utf8');
        const results = JSON.parse(rawData);

        const totalTests = results.stats.expected + results.stats.unexpected + results.stats.skipped;
        const passed = results.stats.expected;
        const failed = results.stats.unexpected;
        
        // 4. Determine status formatting
        const statusEmoji = failed > 0 ? '🚨' : '✅';
        const statusText = failed > 0 ? '*FAILED*' : '*PASSED*';
        const buttonStyle = failed > 0 ? 'danger' : 'primary';

        // 5. Build the Slack Block Kit Message
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
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "📊 View Full Report",
                            "emoji": true
                        },
                        "url": reportUrl,
                        "style": buttonStyle,
                        "action_id": "view_report"
                    }
                ]
            }
        ];

        // 6. Send to Slack
        const result = await web.chat.postMessage({
            channel: channelId,
            text: `Test Run Result: ${statusText}`, // Fallback for notifications
            blocks: blocks
        });

        console.log(`✅ Message sent to Slack: ${result.ts}`);

    } catch (error) {
        console.error('❌ Error sending to Slack:', error);
    }
}

// Execute
sendSlackReport();