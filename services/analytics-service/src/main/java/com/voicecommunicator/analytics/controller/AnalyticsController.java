package com.voicecommunicator.analytics.controller;

import com.voicecommunicator.analytics.model.NetworkMetric;
import com.voicecommunicator.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    @GetMapping("/server/{serverId}")
    public ResponseEntity<List<NetworkMetric>> getServerMetrics(@PathVariable String serverId) {
        return ResponseEntity.ok(analyticsService.getMetricsForServer(serverId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NetworkMetric>> getUserMetrics(@PathVariable String userId) {
        return ResponseEntity.ok(analyticsService.getMetricsForUser(userId));
    }
}
