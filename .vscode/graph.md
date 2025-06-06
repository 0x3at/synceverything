flowchart TD
    %% ===== STYLES =====
    classDef phase fill:#1e293b,stroke:#334155,color:#f8fafc,stroke-width:4px,font-weight:bold,font-size:16px
    classDef entry fill:#3b82f6,stroke:#1d4ed8,color:#ffffff,stroke-width:3px,font-weight:bold
    classDef core fill:#10b981,stroke:#047857,color:#ffffff,stroke-width:2px
    classDef settings fill:#f59e0b,stroke:#b45309,color:#ffffff,stroke-width:2px
    classDef gist fill:#ef4444,stroke:#b91c1c,color:#ffffff,stroke-width:2px
    classDef ui fill:#8b5cf6,stroke:#6d28d9,color:#ffffff,stroke-width:2px
    classDef system fill:#64748b,stroke:#475569,color:#ffffff,stroke-width:2px
    classDef flow fill:#06b6d4,stroke:#0891b2,color:#ffffff,stroke-width:2px
    
    %% ===== PHASE 1: INITIALIZATION =====
    subgraph PHASE1 ["🚀 PHASE 1: INITIALIZATION"]
        direction TB
        START([🚀 activate]) 
        START -.-> INIT_A[📝 Logger Setup]
        START -.-> INIT_B[🖥️ Platform Detection]
        START -.-> INIT_C[⚙️ Configuration Load]
        
        INIT_A -.-> STORE_SETUP[💾 Value Stores Creation]
        INIT_B -.-> STORE_SETUP
        INIT_C -.-> STORE_SETUP
        
        STORE_SETUP --> STORE_A[🔑 masterId Store]
        STORE_SETUP --> STORE_B[📁 settingsPath Store] 
        STORE_SETUP --> STORE_C[⌨️ keybindingsPath Store]
    end

    %% ===== PHASE 2: PATH VALIDATION =====
    subgraph PHASE2 ["✅ PHASE 2: PATH VALIDATION"]
        direction TB
        PATH_START[🔍 validatePaths]
        
        PATH_START --> PATH_A{Settings Path Exists?}
        PATH_A -->|No| PATH_B[📂 findConfigFile - Settings]
        PATH_B --> PATH_C[🔍 Auto-detect Platform Paths]
        PATH_C -->|Found| PATH_FOUND_S[✅ Settings Path Set]
        PATH_C -->|Not Found| PATH_MANUAL_S[👆 Manual Selection - Settings]
        PATH_A -->|Yes| PATH_FOUND_S
        
        PATH_FOUND_S --> PATH_D{Keybindings Path Exists?}
        PATH_D -->|No| PATH_E[📂 findConfigFile - Keybindings]
        PATH_E --> PATH_F[🔍 Auto-detect Platform Paths]
        PATH_F -->|Found| PATH_FOUND_K[✅ Keybindings Path Set]
        PATH_F -->|Not Found| PATH_MANUAL_K[👆 Manual Selection - Keybindings]
        PATH_D -->|Yes| PATH_FOUND_K
    end

    %% ===== PHASE 3: FILE OPERATIONS SETUP =====
    subgraph PHASE3 ["📄 PHASE 3: FILE OPERATIONS"]
        direction TB
        FILE_START[📄 File Operations Setup]
        
        FILE_START --> FILE_A[📋 getSettings Function]
        FILE_START --> FILE_B[💾 setSettings Function]
        FILE_START --> FILE_C[⌨️ getKeybindings Function]
        FILE_START --> FILE_D[💾 setKeybindings Function]
        FILE_START --> FILE_E[📦 getExtensions Function]
        FILE_START --> FILE_F[🔄 setExtensions Function]
    end

    %% ===== PHASE 4: GITHUB AUTHENTICATION =====
    subgraph PHASE4 ["🔐 PHASE 4: GITHUB SETUP"]
        direction TB
        GITHUB_START[🔧 initializeMasterGist]
        
        GITHUB_START --> AUTH_CHECK{Master ID Exists?}
        AUTH_CHECK -->|No| AUTH_A[🔐 GitHub Authentication]
        AUTH_A --> AUTH_B[📋 getAllGists]
        AUTH_B --> AUTH_C{Master Gist Found?}
        AUTH_C -->|Yes| AUTH_FOUND[✅ Use Existing Gist]
        AUTH_C -->|No| AUTH_CREATE[🆕 createMasterGist]
        AUTH_CREATE --> AUTH_GENESIS[🎨 Create Genesis Profile]
        AUTH_CHECK -->|Yes| AUTH_FOUND
        
        AUTH_FOUND --> GIST_READY[✅ Gist Ready]
        AUTH_GENESIS --> GIST_READY
    end

    %% ===== PHASE 5: COMMAND REGISTRATION =====
    subgraph PHASE5 ["🎛️ PHASE 5: COMMANDS"]
        direction TB
        CMD_START[🎛️ Register Commands]
        
        CMD_START --> CMD_A[➕ Create Profile Command]
        CMD_START --> CMD_B[⬇️ Pull Profile Command]
        CMD_START --> CMD_C[🔄 Update Profile Command]
        CMD_START --> CMD_D[🗑️ Delete Profile Command]
        CMD_START --> CMD_E[📋 Show Menu Command]
        CMD_START --> CMD_F[📊 Show Logs Command]
    end

    %% ===== PHASE 6: UI SETUP =====
    subgraph PHASE6 ["🖼️ PHASE 6: UI COMPONENTS"]
        direction TB
        UI_START[🖼️ UI Setup]
        
        UI_START --> UI_A[📊 Status Bar Creation]
        UI_A --> UI_B[⚙️ Status Bar Configuration]
        UI_B --> UI_C[👆 Command Assignment]
        UI_C --> UI_D[✨ Status Bar Display]
    end

    %% ===== PHASE 7: FINALIZATION =====
    subgraph PHASE7 ["🏁 PHASE 7: FINALIZATION"]
        direction TB
        FINAL_START[🏁 Final Setup]
        
        FINAL_START --> FINAL_A[📝 Register Subscriptions]
        FINAL_A --> FINAL_B{Auto-sync Enabled?}
        FINAL_B -->|Yes| FINAL_AUTO[🔄 Auto-sync Logic]
        FINAL_B -->|No| FINAL_SUCCESS
        FINAL_AUTO --> FINAL_SUCCESS[✅ Success Message]
        FINAL_SUCCESS --> COMPLETE([🎉 Activation Complete])
    end

    %% ===== EXECUTION FLOW (TIMELINE) =====
    PHASE1 ==> PHASE2
    PHASE2 ==> PHASE3 
    PHASE3 ==> PHASE4
    PHASE4 ==> PHASE5
    PHASE5 ==> PHASE6
    PHASE6 ==> PHASE7

    %% ===== RUNTIME FLOWS (USER INTERACTIONS) =====
    subgraph RUNTIME ["💫 RUNTIME OPERATIONS"]
        direction LR
        
        subgraph CREATE_FLOW ["➕ Create Profile Flow"]
            direction TB
            C1[📝 Input Name] --> C2[📖 Read Current Config]
            C2 --> C3[☁️ Upload to Gist]
            C3 --> C4[✅ Success Notification]
        end
        
        subgraph PULL_FLOW ["⬇️ Pull Profile Flow"]
            direction TB
            P1[📋 Show Profiles] --> P2[👆 User Selection]
            P2 --> P3[⚠️ Confirm Overwrite]
            P3 --> P4[⚡ Apply Settings]
            P4 --> P5[🔄 Sync Extensions]
            P5 --> P6[⌨️ Update Keybindings]
            P6 --> P7[🔄 Suggest Reload]
        end
        
        subgraph UPDATE_FLOW ["🔄 Update Profile Flow"]
            direction TB
            U1[📋 Select Profile] --> U2[⚠️ Confirm Update]
            U2 --> U3[📖 Read Current Config]
            U3 --> U4[☁️ Update Gist]
            U4 --> U5[✅ Success Notification]
        end
    end

    %% ===== APPLY STYLES =====
    class PHASE1,PHASE2,PHASE3,PHASE4,PHASE5,PHASE6,PHASE7 phase
    class START,COMPLETE entry
    class INIT_A,INIT_B,INIT_C,STORE_SETUP,FILE_START,CMD_START,UI_START,FINAL_START core
    class STORE_A,STORE_B,STORE_C,PATH_FOUND_S,PATH_FOUND_K system
    class FILE_A,FILE_B,FILE_C,FILE_D,PATH_B,PATH_C,PATH_E,PATH_F settings
    class AUTH_A,AUTH_B,AUTH_CREATE,AUTH_GENESIS,GIST_READY gist
    class UI_A,UI_B,UI_C,UI_D,CMD_A,CMD_B,CMD_C,CMD_D,CMD_E,CMD_F ui
    class C1,C2,C3,C4,P1,P2,P3,P4,P5,P6,P7,U1,U2,U3,U4,U5 flow
