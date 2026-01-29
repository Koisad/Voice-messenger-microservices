package com.voicecommunicator.room.controller;

import com.voicecommunicator.room.dto.CreateServerRequestDTO;
import com.voicecommunicator.room.model.Server;
import com.voicecommunicator.room.service.ServerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servers")
@RequiredArgsConstructor
public class ServerController {

    private final ServerService serverService;

    @PostMapping
    public ResponseEntity<Server> createServer(@RequestBody CreateServerRequestDTO createServerRequestDTO, @AuthenticationPrincipal Jwt jwt) {

        String serverName = createServerRequestDTO.getName();
        String userId = jwt.getSubject();

        return ResponseEntity.ok(serverService.createServer(serverName, userId));
    }

    @GetMapping
    public ResponseEntity<List<Server>> getUserServers(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();

        return ResponseEntity.ok(serverService.getUserServers(userId));
    }

}
