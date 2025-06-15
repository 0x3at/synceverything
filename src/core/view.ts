import { window } from 'vscode';
import { logger } from '../extension';
import { ISettings } from '../models/interfaces';
import * as vscode from 'vscode';

export const createConfigView = (
	localSettings: ISettings,
	localExtensions: { name: string; id: string }[],
	localKeybindings: { key: string; command: string }[],
	ignoredSettings: string[],
	ignoredExtensions: string[],
	ignoredKeybindings: { key: string; command: string }[]
) => {
	// Safely serialize data with fallbacks
	const safeJsonStringify = (data: any, fallback: any = null) => {
		try {
			return JSON.stringify(data || fallback);
		} catch (error) {
			logger.error('JSON stringify error:', error);
			return JSON.stringify(fallback);
		}
	};

	// Prepare data with validation and fallbacks
	const safeSettings =
		localSettings && typeof localSettings === 'object' ? localSettings : {};
	const safeExtensions = Array.isArray(localExtensions)
		? localExtensions
		: [];
	const safeKeybindings = Array.isArray(localKeybindings)
		? localKeybindings
		: [];
	const safeIgnoredSettings = Array.isArray(ignoredSettings)
		? ignoredSettings
		: [];
	const safeIgnoredExtensions = Array.isArray(ignoredExtensions)
		? ignoredExtensions
		: [];
	const safeIgnoredKeybindings = Array.isArray(ignoredKeybindings)
		? ignoredKeybindings
		: [];

	// Convert settings object to array format safely
	const settingsArray = Object.entries(safeSettings).map(([key, value]) => ({
		key,
		value
	}));

	// Extract just the keys from ignored keybindings for consistency
	const ignoredKeybindingKeys = safeIgnoredKeybindings.map((kb) =>
		typeof kb === 'object' && kb.key ? kb.key : String(kb)
	);

	// Log data being passed to webview for debugging
	return {
		panel: () =>
			window.createWebviewPanel(
				`SyncEverything`,
				`SE:Sync Settings`,
				vscode.ViewColumn.Active,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			),
		html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Everything Settings</title>
    <style>
        /* Your existing CSS styles remain the same */
        :root {
            --vscode-foreground: var(--vscode-editor-foreground);
            --vscode-background: var(--vscode-editor-background);
            --vscode-input-background: var(--vscode-input-background);
            --vscode-input-border: var(--vscode-input-border);
            --vscode-button-background: var(--vscode-button-background);
            --vscode-button-foreground: var(--vscode-button-foreground);
            --vscode-list-hoverBackground: var(--vscode-list-hoverBackground);
            --vscode-badge-background: var(--vscode-badge-background);
            --vscode-badge-foreground: var(--vscode-badge-foreground);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-background);
            color: var(--vscode-foreground);
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        .header {
            margin-bottom: 30px;
            border-bottom: 1px solid var(--vscode-input-border);
            padding-bottom: 20px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 300;
            margin-bottom: 8px;
        }

        .header p {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .tab-container {
            margin-bottom: 30px;
        }

        .tab-buttons {
            display: flex;
            border-bottom: 1px solid var(--vscode-input-border);
            margin-bottom: 20px;
        }

        .tab-button {
            background: none;
            border: none;
            padding: 12px 20px;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 14px;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
            position: relative;
        }

        .tab-button.active {
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-focusBorder);
        }

        .tab-button:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .controls {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-container {
            flex: 1;
            min-width: 250px;
        }

        .search-input {
            width: 100%;
            padding: 8px 12px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            color: var(--vscode-foreground);
            font-size: 14px;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .filter-buttons {
            display: flex;
            gap: 8px;
        }

        .filter-btn {
            padding: 6px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .filter-btn.active {
            background-color: var(--vscode-focusBorder);
            color: var(--vscode-background);
            border-color: var(--vscode-focusBorder);
        }

        .items-container {
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            max-height: 500px;
            overflow-y: auto;
        }

        .item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-input-border);
            cursor: pointer;
            transition: background-color 0.2s ease;
        }

        .item:last-child {
            border-bottom: none;
        }

        .item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .item.ignored {
            background-color: var(--vscode-list-warningBackground);
            opacity: 0.7;
        }

        .item-checkbox {
            width: 16px;
            height: 16px;
            margin-right: 12px;
            cursor: pointer;
        }

        .item-icon {
            width: 24px;
            height: 24px;
            margin-right: 12px;
            border-radius: 3px;
            background-color: var(--vscode-button-background);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: var(--vscode-button-foreground);
            flex-shrink: 0;
        }

        .item-details {
            flex: 1;
            min-width: 0;
        }

        .item-name {
            font-weight: 500;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .item-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-family: 'Consolas', 'Monaco', monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .item-status {
            margin-left: 12px;
            flex-shrink: 0;
        }

        .status-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-badge.synced {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .status-badge.ignored {
            background-color: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
        }

        .summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 13px;
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .summary-count {
            font-weight: 600;
            color: var(--vscode-focusBorder);
        }

        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-input-border);
        }

        .bulk-actions {
            display: flex;
            gap: 8px;
        }

        .action-button {
            padding: 8px 16px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 14px;
            transition: opacity 0.2s ease;
        }

        .action-button.primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
        }

        .action-button.secondary {
            background-color: var(--vscode-input-background);
            color: var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .action-button:hover {
            opacity: 0.8;
        }

        .action-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.3;
        }

        .error-state {
            background-color: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Sync Everything Configuration</h1>
            <p>Control which settings, extensions, and keybindings are synchronized across your devices</p>
        </div>

        <div class="tab-container">
            <div class="tab-buttons">
                <button class="tab-button active" data-tab="settings">Settings</button>
                <button class="tab-button" data-tab="extensions">Extensions</button>
                <button class="tab-button" data-tab="keybindings">Keybindings</button>
            </div>

            <!-- Settings Tab -->
            <div class="tab-content active" id="settings-tab">
                <div class="summary" id="settings-summary">
                    <div class="summary-item">
                        <span>Total Settings:</span>
                        <span class="summary-count" id="settings-total">0</span>
                    </div>
                    <div class="summary-item">
                        <span>Synced:</span>
                        <span class="summary-count" id="settings-synced">0</span>
                    </div>
                    <div class="summary-item">
                        <span>Ignored:</span>
                        <span class="summary-count" id="settings-ignored">0</span>
                    </div>
                </div>

                <div class="controls">
                    <div class="search-container">
                        <input type="text" class="search-input" id="settings-search" placeholder="Search settings by key or value...">
                    </div>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="synced">Synced</button>
                        <button class="filter-btn" data-filter="ignored">Ignored</button>
                    </div>
                </div>

                <div class="items-container" id="settings-container"></div>
            </div>

            <!-- Extensions Tab -->
            <div class="tab-content" id="extensions-tab">
                <div class="summary" id="extensions-summary">
                    <div class="summary-item">
                        <span>Total Extensions:</span>
                        <span class="summary-count" id="extensions-total">0</span>
                    </div>
                    <div class="summary-item">
                        <span>Synced:</span>
                        <span class="summary-count" id="extensions-synced">0</span>
                    </div>
                    <div class="summary-item">
                        <span>Protected:</span>
                        <span class="summary-count" id="extensions-ignored">0</span>
                    </div>
                </div>

                <div class="controls">
                    <div class="search-container">
                        <input type="text" class="search-input" id="extensions-search" placeholder="Search extensions by name or ID...">
                    </div>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="synced">Synced</button>
                        <button class="filter-btn" data-filter="ignored">Protected</button>
                    </div>
                </div>

                <div class="items-container" id="extensions-container"></div>
            </div>

            <!-- Keybindings Tab -->
            <div class="tab-content" id="keybindings-tab">
                <div class="summary" id="keybindings-summary">
                    <div class="summary-item">
                        <span>Total Keybindings:</span>
                        <span class="summary-count" id="keybindings-total">0</span>
                    </div>
                    <div class="summary-item">
                        <span>Synced:</span>
                        <span class="summary-count" id="keybindings-synced">0</span>
                    </div>
                    <div class="summary-item">
                        <span>Priority:</span>
                        <span class="summary-count" id="keybindings-ignored">0</span>
                    </div>
                </div>

                <div class="controls">
                    <div class="search-container">
                        <input type="text" class="search-input" id="keybindings-search" placeholder="Search keybindings by command or key...">
                    </div>
                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="synced">Synced</button>
                        <button class="filter-btn" data-filter="ignored">Priority</button>
                    </div>
                </div>

                <div class="items-container" id="keybindings-container"></div>
            </div>
        </div>

        <div class="actions">
            <div class="bulk-actions">
                <button class="action-button secondary" onclick="selectAll()">Select All Visible</button>
                <button class="action-button secondary" onclick="selectNone()">Clear Selection</button>
                <button class="action-button secondary" onclick="toggleSelected()">Toggle Selected</button>
            </div>
            <div>
                <button class="action-button" onclick="resetToDefaults()">Reset</button>
                <button class="action-button" onclick="cancelChanges()">Cancel</button>
                <button class="action-button primary" onclick="saveConfiguration()">Save Changes</button>
            </div>
        </div>
    </div>

    <script>
        // Safely initialize data with error handling
        let configData = {};
        let hasErrors = false;

        try {
            // Initialize with safe data
            configData = {
                settings: ${safeJsonStringify(settingsArray, [])},
                extensions: ${safeJsonStringify(safeExtensions, [])},
                keybindings: ${safeJsonStringify(safeKeybindings, [])},
                settingsIgnored: ${safeJsonStringify(safeIgnoredSettings, [])},
                extensionsIgnored: ${safeJsonStringify(
					safeIgnoredExtensions,
					[]
				)},
                keybindingsIgnored: ${safeJsonStringify(
					ignoredKeybindingKeys,
					[]
				)}
            };

            // Validate data after parsing
            if (!Array.isArray(configData.settings)) configData.settings = [];
            if (!Array.isArray(configData.extensions)) configData.extensions = [];
            if (!Array.isArray(configData.keybindings)) configData.keybindings = [];
            if (!Array.isArray(configData.settingsIgnored)) configData.settingsIgnored = [];
            if (!Array.isArray(configData.extensionsIgnored)) configData.extensionsIgnored = [];
            if (!Array.isArray(configData.keybindingsIgnored)) configData.keybindingsIgnored = [];

            console.log('Configuration data initialized:', {
                settings: configData.settings.length,
                extensions: configData.extensions.length,
                keybindings: configData.keybindings.length,
                settingsIgnored: configData.settingsIgnored.length,
                extensionsIgnored: configData.extensionsIgnored.length,
                keybindingsIgnored: configData.keybindingsIgnored.length
            });

        } catch (error) {
            console.error('Error initializing configuration data:', error);
            hasErrors = true;
            
            // Fallback to empty data
            configData = {
                settings: [],
                extensions: [],
                keybindings: [],
                settingsIgnored: [],
                extensionsIgnored: [],
                keybindingsIgnored: []
            };
        }

        // Current filter and search states for each tab
        let filterStates = {
            settings: { search: '', filter: 'all' },
            extensions: { search: '', filter: 'all' },
            keybindings: { search: '', filter: 'all' }
        };

        // Initialize the interface when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            try {
                if (hasErrors) {
                    showError('Some data failed to load. The configuration view may not display all items correctly.');
                }

                setupTabSwitching();
                setupSearchAndFilter();
                renderAllTabs();

                // Log successful initialization
                console.log('Configuration view initialized successfully');
            } catch (error) {
                console.error('Error during initialization:', error);
                showError('Failed to initialize configuration view: ' + error.message);
            }
        });

        function showError(message) {
            const container = document.querySelector('.container');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-state';
            errorDiv.innerHTML = '<strong>Error:</strong> ' + message;
            container.insertBefore(errorDiv, container.firstChild);
        }

        // Rest of your existing JavaScript functions remain the same...
        function setupTabSwitching() {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    button.classList.add('active');
                    const targetTab = button.getAttribute('data-tab');
                    document.getElementById(targetTab + '-tab').classList.add('active');
                });
            });
        }

        function setupSearchAndFilter() {
            ['settings', 'extensions', 'keybindings'].forEach(tabName => {
                const searchInput = document.getElementById(tabName + '-search');
                const filterButtons = document.querySelectorAll(\`#\${tabName}-tab .filter-btn\`);

                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        filterStates[tabName].search = e.target.value.toLowerCase();
                        renderItems(tabName);
                    }, 300);
                });

                filterButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        filterButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        filterStates[tabName].filter = btn.getAttribute('data-filter');
                        renderItems(tabName);
                    });
                });
            });
        }

        function renderAllTabs() {
            try {
                renderItems('settings');
                renderItems('extensions');
                renderItems('keybindings');
            } catch (error) {
                console.error('Error rendering tabs:', error);
                showError('Failed to render configuration items: ' + error.message);
            }
        }

        function renderItems(tabName) {
            try {
                const container = document.getElementById(tabName + '-container');
                const items = configData[tabName] || [];
                const ignoredList = configData[tabName + 'Ignored'] || [];
                const { search, filter } = filterStates[tabName];

                const filteredItems = items.filter(item => {
                    const matchesSearch = searchMatches(item, search, tabName);
                    const isIgnored = isItemIgnored(item, ignoredList, tabName);
                    
                    if (filter === 'synced') return matchesSearch && !isIgnored;
                    if (filter === 'ignored') return matchesSearch && isIgnored;
                    return matchesSearch;
                });

                if (filteredItems.length === 0) {
                    container.innerHTML = \`
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <div>No \${tabName} found matching current filters</div>
                        </div>
                    \`;
                } else {
                    container.innerHTML = filteredItems.map(item => renderItem(item, tabName, ignoredList)).join('');
                }

                updateSummary(tabName);
            } catch (error) {
                console.error(\`Error rendering \${tabName} items:\`, error);
            }
        }

        function searchMatches(item, search, tabName) {
            if (!search) return true;
            
            try {
                switch (tabName) {
                    case 'settings':
                        return (item.key && item.key.toLowerCase().includes(search)) || 
                               (item.value && String(item.value).toLowerCase().includes(search));
                    case 'extensions':
                        return (item.name && item.name.toLowerCase().includes(search)) || 
                               (item.id && item.id.toLowerCase().includes(search));
                    case 'keybindings':
                        return (item.key && item.key.toLowerCase().includes(search)) || 
                               (item.command && item.command.toLowerCase().includes(search));
                    default:
                        return true;
                }
            } catch (error) {
                console.error('Error in searchMatches:', error);
                return false;
            }
        }

        function isItemIgnored(item, ignoredList, tabName) {
            try {
                switch (tabName) {
                    case 'settings':
                        return ignoredList.includes(item.key);
                    case 'extensions':
                        return ignoredList.includes(item.id);
                    case 'keybindings':
                        return ignoredList.includes(item.key);
                    default:
                        return false;
                }
            } catch (error) {
                console.error('Error in isItemIgnored:', error);
                return false;
            }
        }

        function renderItem(item, tabName, ignoredList) {
            try {
                const isIgnored = isItemIgnored(item, ignoredList, tabName);
                const identifier = getItemIdentifier(item, tabName);
                
                let icon, title, subtitle;
                
                switch (tabName) {
                    case 'settings':
                        icon = '⚙️';
                        title = item.key || 'Unknown Setting';
                        subtitle = String(item.value || '');
                        break;
                    case 'extensions':
                        icon = (item.name || 'EX').substring(0, 2).toUpperCase();
                        title = item.name || 'Unknown Extension';
                        subtitle = item.id || '';
                        break;
                    case 'keybindings':
                        icon = '⌨️';
                        title = (item.key || 'Unknown') + ' → ' + (item.command || 'Unknown');
                        subtitle = '';
                        break;
                }

                const statusLabel = getStatusLabel(tabName, isIgnored);
                const statusClass = isIgnored ? 'ignored' : 'synced';

                return \`
                    <div class="item \${isIgnored ? 'ignored' : ''}" onclick="toggleItemIgnore('\${tabName}', '\${identifier.replace(/'/g, "\\\\'")}')">
                        <input type="checkbox" class="item-checkbox" \${isIgnored ? 'checked' : ''} 
                               onchange="toggleItemIgnore('\${tabName}', '\${identifier.replace(/'/g, "\\\\'")}')" onclick="event.stopPropagation()">
                        <div class="item-icon">\${icon}</div>
                        <div class="item-details">
                            <div class="item-name">\${title}</div>
                            \${subtitle ? '<div class="item-description">' + subtitle + '</div>' : ''}
                        </div>
                        <div class="item-status">
                            <span class="status-badge \${statusClass}">\${statusLabel}</span>
                        </div>
                    </div>
                \`;
            } catch (error) {
                console.error('Error rendering item:', error);
                return '<div class="item">Error rendering item</div>';
            }
        }

        function getItemIdentifier(item, tabName) {
            switch (tabName) {
                case 'settings': return item.key || '';
                case 'extensions': return item.id || '';
                case 'keybindings': return item.key || '';
                default: return '';
            }
        }

        function getStatusLabel(tabName, isIgnored) {
            if (tabName === 'extensions') {
                return isIgnored ? 'Protected' : 'Synced';
            } else if (tabName === 'keybindings') {
                return isIgnored ? 'Priority' : 'Synced';
            } else {
                return isIgnored ? 'Ignored' : 'Synced';
            }
        }

        function toggleItemIgnore(tabName, identifier) {
            try {
                const ignoredList = configData[tabName + 'Ignored'];
                const index = ignoredList.indexOf(identifier);
                
                if (index === -1) {
                    ignoredList.push(identifier);
                } else {
                    ignoredList.splice(index, 1);
                }
                
                renderItems(tabName);
            } catch (error) {
                console.error('Error toggling item ignore:', error);
            }
        }

        function updateSummary(tabName) {
            try {
                const items = configData[tabName] || [];
                const ignoredList = configData[tabName + 'Ignored'] || [];
                
                const total = items.length;
                const ignored = ignoredList.length;
                const synced = total - ignored;
                
                document.getElementById(tabName + '-total').textContent = total;
                document.getElementById(tabName + '-synced').textContent = synced;
                document.getElementById(tabName + '-ignored').textContent = ignored;
            } catch (error) {
                console.error('Error updating summary:', error);
            }
        }

        function selectAll() {
            try {
                const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
                const container = document.getElementById(activeTab + '-container');
                const checkboxes = container.querySelectorAll('.item-checkbox');
                
                checkboxes.forEach(checkbox => {
                    if (!checkbox.checked) {
                        checkbox.checked = true;
                        const item = checkbox.closest('.item');
                        item.click();
                    }
                });
            } catch (error) {
                console.error('Error in selectAll:', error);
            }
        }

        function selectNone() {
            try {
                const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
                const container = document.getElementById(activeTab + '-container');
                const checkboxes = container.querySelectorAll('.item-checkbox');
                
                checkboxes.forEach(checkbox => {
                    if (checkbox.checked) {
                        checkbox.checked = false;
                        const item = checkbox.closest('.item');
                        item.click();
                    }
                });
            } catch (error) {
                console.error('Error in selectNone:', error);
            }
        }

        function toggleSelected() {
            try {
                const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
                const container = document.getElementById(activeTab + '-container');
                const checkboxes = container.querySelectorAll('.item-checkbox');
                
                checkboxes.forEach(checkbox => {
                    const item = checkbox.closest('.item');
                    item.click();
                });
            } catch (error) {
                console.error('Error in toggleSelected:', error);
            }
        }

        function saveConfiguration() {
            try {
                const configuration = {
                    settings: configData.settingsIgnored || [],
                    extensions: configData.extensionsIgnored || [], // Fixed: was 'exts'
                    keybindings: configData.keybindingsIgnored || []
                };

                console.log('Saving configuration:', configuration);
                
                if (window.acquireVsCodeApi) {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                        command: 'save',
                        data: configuration
                    });
                } else {
                    console.error('VS Code API not available');
                }
            } catch (error) {
                console.error('Error saving configuration:', error);
                alert('Failed to save configuration: ' + error.message);
            }
        }

        function resetToDefaults() {
            try {
                if (confirm('Are you sure you want to reset all ignore lists? This will remove all current exclusions and protections.')) {
                    configData.settingsIgnored = [];
                    configData.extensionsIgnored = [];
                    configData.keybindingsIgnored = [];
                    renderAllTabs();
                }
            } catch (error) {
                console.error('Error resetting to defaults:', error);
            }
        }

        function cancelChanges() {
            try {
                if (window.acquireVsCodeApi) {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                        command: 'cancel'
                    });
                }
            } catch (error) {
                console.error('Error canceling changes:', error);
            }
        }

        // Enhanced search functionality with keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            try {
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
                    const searchInput = document.getElementById(activeTab + '-search');
                    searchInput.focus();
                    searchInput.select();
                }
                
                if (e.key === 'Escape') {
                    const activeTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
                    const searchInput = document.getElementById(activeTab + '-search');
                    if (document.activeElement === searchInput) {
                        searchInput.value = '';
                        filterStates[activeTab].search = '';
                        renderItems(activeTab);
                        searchInput.blur();
                    }
                }
                
                if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.matches('input')) {
                    e.preventDefault();
                    selectAll();
                }
            } catch (error) {
                console.error('Error in keyboard shortcuts:', error);
            }
        });
    </script>
</body>
</html>`
	};
};
