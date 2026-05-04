use serde::Deserialize;
use serde_json::json;

const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
pub const DEFAULT_MODEL: &str = "google/gemini-3.1-flash-lite-preview";
const TIMEOUT_SECS: u64 = 10;

const VALID_STATES: &[&str] = &["focus", "calm", "deep", "spark", "burn", "fade", "rest"];
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

fn insight_json_schema() -> serde_json::Value {
    json!({
        "type": "json_schema",
        "json_schema": {
            "name": "wisp_insight",
            "strict": true,
            "schema": {
                "type": "object",
                "properties": {
                    "state": {
                        "type": "string",
                        "enum": VALID_STATES
                    },
                    "insight": { "type": "string" },
                    "extended": { "type": "string" },
                    "type": {
                        "type": "string",
                        "enum": VALID_TYPES
                    }
                },
                "required": ["state", "insight", "extended", "type"],
                "additionalProperties": false
            }
        }
    })
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

    let body = json!({
        "model": DEFAULT_MODEL,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user",   "content": user_message  }
        ],
        "response_format": insight_json_schema(),
        "max_tokens": 300
    });

    let response = client
        .post(OPENROUTER_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://github.com/hyowonbernabe/wisp")
        .header("X-Title", "Wisp")
        .json(&body)
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

    // Strict schema should catch these, but defend at runtime too
    if !VALID_STATES.contains(&insight.state.as_str()) {
        return Err(format!("unknown state: {}", insight.state));
    }
    if !VALID_TYPES.contains(&insight.insight_type.as_str()) {
        return Err(format!("unknown insight type: {}", insight.insight_type));
    }
    if insight.insight.is_empty() || insight.extended.is_empty() {
        return Err("incomplete insight response".to_string());
    }

    Ok(insight)
}
