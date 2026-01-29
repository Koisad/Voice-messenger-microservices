package com.voicecommunicator.room.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.stereotype.Indexed;

@Data
@Document(collection = "members")
public class Member {
    @Id
    private String id;

    @Indexed
    private String serverId;

    @Indexed
    private String userId;

    private Role role;
}
