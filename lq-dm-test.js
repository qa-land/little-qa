
const fs = require('fs');
const { WebClient } = require('@slack/web-api');


const token = process.env.SLACK_BOT_TOKEN
const web = new WebClient(token);
const channelId = 'C0AJ7JV4H3P'; 
const reportUrl = 'https://qa-land.github.io/little-qa/'; 
const resultsPath = './results.json';

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