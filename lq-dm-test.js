const fs = require('fs');


const slackBotToken = "xoxb-3582468532-10618794260917-qJknfJzYLbiwTaWPx1rd69G7"; 
const targetUserId = "U062J9C1VMM";


function folderNameToTitle(folderName) {
    return folderName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

async function awakenLQ() {
    try {
        
        const data = JSON.parse(fs.readFileSync('./test-results/.last-run.json', 'utf8'));
        
      
        const failedTestIds = data.failedTests || [];
        if (data.status === 'passed' || failedTestIds.length === 0) {
            console.log("✅ No failures found in .last-run.json. LQ stays asleep.");
            return;
        }

        const resultsDir = './test-results';
        const entries = fs.readdirSync(resultsDir, { withFileTypes: true });
        const failedTestNames = entries
            .filter(e => e.isDirectory() && e.name !== '.last-run.json')
            .map(e => folderNameToTitle(e.name));

        let message = `🃏 **LQ has detected the following truths in your last run:**\n\n`;
        
        if (failedTestNames.length > 0) {
            failedTestNames.forEach(name => {
                message += `🚨 *Failed Test:* ${name}\n\n`;
            });
        } else {
            failedTestIds.forEach(id => {
                message += `🚨 *Failed Test ID:* ${id}\n\n`;
            });
        }

      
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${slackBotToken}`
            },
            body: JSON.stringify({
                channel: targetUserId,
                text: message
            })
        });

        const result = await response.json();
        if (result.ok) {
            console.log("✅ Smart LQ has spoken in your DMs.");
        } else {
            console.error("❌ Slack Error:", result.error);
        }

    } catch (err) {
        console.error("❌ Error reading .last-run.json:", err.message);
    }
}

awakenLQ();