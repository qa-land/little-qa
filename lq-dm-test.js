const fs = require('fs');

const slackBotToken = "xoxb-3582468532-10618794260917-qJknfJzYLbiwTaWPx1rd69G7"; 
const channelId = "C0AJ7JV4H3P"; 

async function reportToChannel() {
    try {
        const data = JSON.parse(fs.readFileSync('./results.json', 'utf8')); 
        const failures = data.tests.filter(t => t.status !== 'expected');

        if (failures.length === 0) return;

        // Build the Block Kit payload
        const blocks = [
            {
                "type": "header",
                "text": { "type": "plain_text", "text": "🃏 Little LQ: Test Failure Report" }
            },
            {
                "type": "section",
                "text": { "type": "mrkdwn", "text": `*Status:* 🚨 *${failures.length} Tests Failed*` }
            },
            { "type": "divider" }
        ];

        // Add each failure as a section
        failures.forEach(fail => {
            blocks.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `*Test:* ${fail.name}\n*File:* \`${fail.file}\`\n*Error:* \`Assertion Error\``
                }
            });
        });

        // Add a button at the bottom
        blocks.push({
            "type": "actions",
            "elements": [{
                "type": "button",
                "text": { "type": "plain_text", "text": "View Full Report" },
                "url": "https://playwright-report.qabrains.com/", // Replace with your actual report link for the demo!
                "style": "danger"
            }]
        });

        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${slackBotToken}`
            },
            body: JSON.stringify({ channel: channelId, blocks: blocks })
        });

        const result = await response.json();
        console.log(result.ok ? "✅ Professional report sent!" : `❌ Error: ${result.error}`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

reportToChannel();