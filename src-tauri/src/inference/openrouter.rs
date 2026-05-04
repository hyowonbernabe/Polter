use serde::{Deserialize, Serialize};

const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL: &str = "deepseek/deepseek-chat-v3-0324:free";
const TIMEOUT_SECS: u64 = 10;

const VALID_TYPES: &[&str] = &[
    "flow_detection", "fatigue_signal", "pattern_revelation", "avoidance_detection",
    "peak_performance", "stress_tell", "anomaly", "break_signal", "comparative",
    "returning_user",
];

#[derive(Debug, Deserialize, Clone)]
pub struct InsightResponse {
    pub state: String,
    pub insight: String,
    pub extended: String,
    #[serde(rename = "type")]
    pub insight_type: String,
}

#[derive(Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    response_format: ResponseFormat,
    max_tokens: u32,
}

#[derive(Serialize)]
struct ResponseFormat {
    #[serde(rename = "type")]
    format_type: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageContent,
}

#[derive(Deserialize)]
struct MessageContent {
    content: String,
}

pub async fn call_openrouter(
    api_key: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<InsightResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())?;

    let request = ChatRequest {
        model: DEFAULT_MODEL.to_string(),
        messages: vec![
            ChatMessage { role: "system".to_string(), content: system_prompt.to_string() },
            ChatMessage { role: "user".to_string(), content: user_message.to_string() },
        ],
        response_format: ResponseFormat { format_type: "json_object".to_string() },
        max_tokens: 300,
    };

    let response = client
        .post(OPENROUTER_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://github.com/hyowonbernabe/wisp")
        .header("X-Title", "Wisp")
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("OpenRouter {status}: {body}"));
    }

    let chat: ChatResponse = response.json().await.map_err(|e| e.to_string())?;
    let content = chat
        .choices
        .into_iter()
        .next()
        .ok_or_else(|| "no choices in response".to_string())?
        .message
        .content;

    let insight: InsightResponse =
        serde_json::from_str(&content).map_err(|e| format!("parse error: {e}"))?;

    if !VALID_TYPES.contains(&insight.insight_type.as_str()) {
        return Err(format!("unknown insight type: {}", insight.insight_type));
    }
    if insight.state.is_empty() || insight.insight.is_empty() || insight.extended.is_empty() {
        return Err("incomplete insight response".to_string());
    }

    Ok(insight)
}
