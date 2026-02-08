package com.voicecommunicator.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${AI_API_KEY}")
    private String aiApiKey;

    @Value("${AI_URL}")
    private String aiUrl;

    @RabbitListener(queues = "text.analyze")
    public void analyzeMessage(Map<String, Object> payload) {
        String messageId = (String) payload.get("messageId");
        String content = (String) payload.get("content");

        log.info("AI: Analyzing message: {}", content);

        boolean isToxic = callAICheck(content);

        Map<String, Object> result = new HashMap<>();
        result.put("messageId", messageId);
        result.put("isToxic", isToxic);

        rabbitTemplate.convertAndSend("text.result", result);
        log.info("AI: Analysis result sent ({})", isToxic);
    }

    private boolean callAICheck(String textToAnalyze) {
        try {
            String prompt = String.format("""
                Analyze the following text for toxicity, hate speech, or profanity.
                Text: "%s"
                
                Return a JSON object with a single boolean field "isToxic".
                Example: {"isToxic": true}
                Do not add markdown formatting like ```json.
                """, textToAnalyze.replace("\"", "'"));

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", prompt)
                            ))
                    )
            );

            RestClient restClient = RestClient.create();
            String response = restClient.post()
                    .uri(aiUrl + aiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            String textResponse = root.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();

            String cleanJson = textResponse
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();

            JsonNode jsonResponse = objectMapper.readTree(cleanJson);
            return jsonResponse.path("isToxic").asBoolean(false);

        } catch (Exception e) {
            log.error("AI connection error: {}", e.getMessage());
            return false;
        }
    }

}
