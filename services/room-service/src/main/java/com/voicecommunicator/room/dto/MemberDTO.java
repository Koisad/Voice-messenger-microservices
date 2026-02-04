package com.voicecommunicator.room.dto;

import com.voicecommunicator.room.model.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MemberDTO {
    private String userId;
    private String username;
    private Role role;
}