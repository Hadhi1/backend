// routes/handler.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const GOOGLE_API_KEY = "AIzaSyB_IYNtJN6QruC2GuRUWPy09p-tEyBVpjQ";
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";


router.post("/summarize-and-send", async (req, res) => {
  const { tasks, link } = req.body;

  console.log("Received /summarize-and-send request:", { tasks, link });

  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Tasks array is required" });
  }

  try {
    // Format task list string for prompt
    const taskList = tasks
      .map((task, i) => {
        const due = task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : "";
        return `${i + 1}. ${task.title} [${task.completed ? "Completed" : "Pending"}] [${task.priority}] ${due}`;
      })
      .join("\n");

    // Include link if provided
    const linkSection = link ? `\n\nInclude this link in the summary: ${link}` : "";

    // Prepare prompt for Gemini API
    const prompt = `Summarize the following tasks in Markdown format with the following sections:
I. main detailed explanation of the tasks and properly arranging them in a correct order for working and explaining them correctly
1. Overview (total, completed, pending)
2. High Priority Tasks
3. Completed Tasks
4. Pending Tasks${linkSection}

Tasks:
${taskList}`;

    console.log("Prompt sent to Gemini API:", prompt);

    // Call Gemini API
    let summary = "No summary generated.";
    try {
      const geminiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      summary = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || summary;
      console.log("Gemini API summary:", summary);
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError.response?.data || geminiError.message);
      return res.status(500).json({ error: "Gemini API error", message: geminiError.message });
    }

    // Format Slack message blocks
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📋 Todo Summary",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: summary,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Generated at:* ${new Date().toLocaleString()}`,
          },
        ],
      },
    ];

    // Slack webhook URL (from query param or default)
    const webhookUrl = req.query?.webhookUrl || SLACK_WEBHOOK_URL;

    // Send summary to Slack unless only summary requested
    try {
      if (!req.query?.summaryOnly) {
        await axios.post(webhookUrl, { blocks });
        console.log("Slack message sent successfully");
      }
    } catch (slackError) {
      console.error("Slack send error:", slackError.response?.data || slackError.message);
      // You can decide to still respond with summary or fail - here we continue
    }

    // Send success response with summary text
    res.json({ success: true, summary });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({
      error: "Something went wrong while summarizing or sending to Slack.",
      message: error.message,
    });
  }
});

module.exports = router;
