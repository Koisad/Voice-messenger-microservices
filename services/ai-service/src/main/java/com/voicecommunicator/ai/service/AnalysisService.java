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
                [INST] You are a content moderation system.
                Analyze this text: "%s"
                
                Is it toxic, hate speech, or profanity?
                Return ONLY a JSON object: {"isToxic": true} or {"isToxic": false}
                [/INST]
                """, textToAnalyze.replace("\"", "'").replace("\n", " "));

            Map<String, Object> requestBody = Map.of(
                    "inputs", prompt,
                    "parameters", Map.of(
                            "return_full_text", false,
                            "max_new_tokens", 50,
                            "temperature", 0.1
                    )
            );

            RestClient restClient = RestClient.create();

            String response = restClient.post()
                    .uri(aiUrl.trim())
                    .header("Authorization", "Bearer " + aiApiKey.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.info("HF Response Raw: {}", response);

            JsonNode rootArray = objectMapper.readTree(response);

            if (rootArray.isArray() && !rootArray.isEmpty()) {
                String generatedText = rootArray.get(0).path("generated_text").asText();

                String cleanJson = generatedText
                        .replace("```json", "")
                        .replace("```", "")
                        .trim();

                JsonNode jsonResponse = objectMapper.readTree(cleanJson);
                return jsonResponse.path("isToxic").asBoolean(false);
            }

            return false;

        } catch (Exception e) {
            log.error("Hugging Face connection error: {}", e.getMessage());

            if (e.getMessage().contains("503")) {
                log.warn("Model is loading");
            }
            return false;
        }
    }

}
