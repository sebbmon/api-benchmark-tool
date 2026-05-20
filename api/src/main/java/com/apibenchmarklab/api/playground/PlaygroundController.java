package com.apibenchmarklab.api.playground;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/playground")
public class PlaygroundController {
    private final PlaygroundService playgroundService;

    public PlaygroundController(PlaygroundService playgroundService) {
        this.playgroundService = playgroundService;
    }

    @PostMapping("/request")
    public PlaygroundResponse send(@Valid @RequestBody PlaygroundRequest request) {
        return playgroundService.send(request);
    }
}
