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
    /// Polter's own observation note — written to wisp_memories, never shown to the user.
    /// Optional so that responses lacking this field parse correctly.
    pub memory_note: Option<String>,
}

pub enum VoiceResponse {
    Insight(InsightResponse),
    Mutter(String),
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

fn extract_json(content: &str) -> &str {
    let s = content.trim();
    let inner = if let Some(rest) = s.strip_prefix("```json") {
        rest
    } else if let Some(rest) = s.strip_prefix("```") {
        rest
    } else {
        return s;
    };
    inner.trim_start_matches('\n').trim_end().trim_end_matches("```").trim()
}

pub async fn call_openrouter(
    api_key: &str,
    system_prompt: &str,
    user_message: &str,
) -> Result<VoiceResponse, String> {
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
        "response_format": { "type": "json_object" },
        "max_tokens": 400
    });

    let response = client
        .post(OPENROUTER_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://github.com/hyowonbernabe/polter")
        .header("X-Title", "Polter")
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

    let raw: serde_json::Value =
        serde_json::from_str(extract_json(&content)).map_err(|e| format!("parse error: {e}"))?;

    let tier = raw
        .get("tier")
        .and_then(|t| t.as_str())
        .ok_or_else(|| "missing tier field".to_string())?;

    match tier {
        "mutter" => {
            let text = raw
                .get("insight")
                .and_then(|i| i.as_str())
                .filter(|s| !s.is_empty())
                .ok_or_else(|| "mutter missing insight".to_string())?;
            Ok(VoiceResponse::Mutter(text.to_string()))
        }
        "insight" => {
            let insight: InsightResponse =
                serde_json::from_value(raw).map_err(|e| format!("insight parse error: {e}"))?;
            if !VALID_STATES.contains(&insight.state.as_str()) {
                return Err(format!("unknown state: {}", insight.state));
            }
            if !VALID_TYPES.contains(&insight.insight_type.as_str()) {
                return Err(format!("unknown insight type: {}", insight.insight_type));
            }
            if insight.insight.is_empty() || insight.extended.is_empty() {
                return Err("incomplete insight response".to_string());
            }
            Ok(VoiceResponse::Insight(insight))
        }
        other => Err(format!("unknown tier: {other}")),
    }
}
