# Agent Registries

These registries are locator and ownership maps for reusable Cloud Deploy capabilities. They are not complete API documentation. Source files and exported TypeScript types are the implementation truth.

Use this file only when the task involves creating, reusing, moving, renaming, changing, or deleting shared components, utilities, or config modules.

## Registry Status

- `candidate`: recommended locator hint. Do not assume the source file exists, and do not implement it unless the current task needs that reusable capability.
- `active`: source should exist and may be used after reading the registered path. Source exports and TypeScript types override registry summaries.
- `deprecated`: do not use for new work unless maintaining existing usage.

If a registry summary and source disagree, follow source and update the registry summary in the same change.

## Shared Component Registry

Shared components live in `src/components/shared`. Add a component here only when the same business behavior appears in multiple places or when it removes meaningful complexity from pages.

This registry is the first lookup table for reusable Cloud Deploy UI behavior. It is an index, not full component documentation.

When adding a shared component, update this registry with its path, status, responsibility, public props summary, and shadcn overlap. Also check whether a shadcn component already covers the same job. If there is overlap, document the difference so future agents can choose correctly.

The `Key Props` column is a selection aid. The component's exported props type is the API contract.

| Component | Path | Status | Responsibility | Key Props | Prefer Over shadcn When | shadcn Overlap |
| --- | --- | --- | --- | --- | --- | --- |
| `AppHeader` | `src/components/shared/app-header.tsx` | active | Global top bar with product name, wallet connect/profile menu, and settings trigger | `walletLabel`, `walletAddress`, `onConnectWallet`, `onCopyWalletAddress`, `onDisconnectWallet`, `onOpenSettings` | Rendering the app-level header | Uses `Button` |
| `ProgressSteps` | `src/components/shared/progress-steps.tsx` | active | Four-step deploy progress with current step, completed states, and back navigation support | `steps`, `currentStep`, `completedSteps`, `onStepBack` | Showing the Cloud Deploy workflow | Uses `Button`, `Progress`, `Badge` |
| `SettingsDialog` | `src/components/shared/settings-dialog.tsx` | active | Persisted settings editor for RPC endpoint, Lyquid ID, ABI, Build Method, and Deploy Method | `open`, `onOpenChange`, `settings`, `methodOptions`, `methodErrors`, `onSave` | Editing Cloud Deploy settings together | Uses `Dialog`, `Input`, `Textarea`, `Select`, `Button`, `Label` |
| `AbiMethodSelect` | `src/components/shared/abi-method-select.tsx` | active | ABI-backed method dropdown with missing-method error display | `methods`, `value`, `onValueChange`, `missingMessage` | Selecting Build Method or Deploy Method from parsed ABI options | Uses `Select`, `Label` |
| `ConstructorParamsForm` | `src/components/shared/constructor-params-form.tsx` | active | Renders constructor inputs from ABI-derived fields and returns collected values | `constructorFields`, `values`, `onValuesChange` | A target Lyquid constructor schema must be collected | Uses `Input`, `Label` |
| `PayloadReviewPanel` | `src/components/shared/payload-review-panel.tsx` | active | Displays hashes, prepared/deploy payload, raw JSON, copy, and download actions | `hashes`, `payload`, `onCopy`, `onDownload` | Step 3 reviews build/deploy output | Uses `Button`, `ScrollArea` |
| `ResultSummary` | `src/components/shared/result-summary.tsx` | active | Displays deploy result fields, raw response, transaction lookup state, collapsible calldata, and copyable deploy ABI | `result` | Step 4 displays deployment result | Uses `Badge`, `Button`, `ScrollArea` |
| `ProjectTree` | `src/components/project-tree.tsx` | active | Displays uploaded project paths with directory expand/collapse, optional TOML-only filtering, and optional explicit TOML target radio selection | `nodes`, `selectedTomlPath`, `sourceOnly`, `onSelectPath`, `onSelectTarget`, `showTargetSelector` | Rendering uploaded resources in legacy upload and workbench explorer | Uses `Button`; raw radio only when target selector is enabled because no shadcn radio primitive exists |
| `ResourceExplorer` | `src/components/workbench/resource-explorer.tsx` | active | Workbench folder upload, parse error dialog, TOML-only filter, resource tree, and deploy target selection | `project`, `selectedTomlPath`, `onProjectChange`, `onSelectTarget`, `onOpenFile` | Workbench resource pane | Uses `Input`, `Label`, `Button`, `Badge`, `Dialog`, `ScrollArea`, `ProjectTree` |
| `WorkbenchTabs` | `src/components/workbench/workbench-tabs.tsx` | active | Closable compiler-style tab strip and active tab content viewport | `tabs`, `activeTabId`, `onActiveTabChange`, `onCloseTab`, `renderTabContent` | Workbench output pane | Uses `Button`, `ScrollArea` |
| `FileDetailTab` | `src/components/workbench/file-detail-tab.tsx` | active | Renders readonly TOML file previews and non-TOML metadata in workbench tabs | `path`, `files`, `tomlFiles` | Workbench file detail tabs | Uses `Badge`, `Textarea` |
| `RunOutputTab` | `src/components/workbench/run-output-tab.tsx` | active | Raw-first build/deploy/history output renderer with copyable raw JSON, ABI item, env dialog, tx lookup pending/check state, and transaction details | `tab` | Workbench run/history tabs | Uses `Badge`, `Button`, `Dialog`, `ScrollArea` |
| `ActionDeck` | `src/components/workbench/action-deck.tsx` | active | Bottom workbench build/deploy action cards shown only after a TOML target is selected | `selectedTomlPath`, `isBuilding`, `isDeploying`, `onBuild`, `onDeploy` | Workbench action pane | Uses `Button` |
| `DeployHistoryPanel` | `src/components/workbench/deploy-history-panel.tsx` | active | Latest 10 deploy history list that opens records by tx hash and saved env | `records`, `onOpenRecord` | Workbench history pane | Uses `Badge`, `Button`, `ScrollArea` |
| `DeployWorkbench` | `src/components/workbench/deploy-workbench.tsx` | active | Composes the four resizable compiler workbench panes | `layout`, `onLayoutChange`, pane render props | Rendering the workbench page shell | Uses `ResizeHandle` |
| `ResizeHandle` | `src/components/workbench/resizable-panels.tsx` | active | Pointer-driven splitter handle for workbench panes | `ariaLabel`, `orientation`, `onDrag` | Resizing workbench panes | Raw `div` with separator role |

Example conflict rule:

- Use shadcn `Button` for normal buttons.
- Do not create `SharedButton`.
- If a future `SharedButton` is proposed, it must document behavior that shadcn `Button` cannot own, such as wallet-aware loading, permission gating, or deploy-step telemetry. Until then, use shadcn `Button`.

## Utility Registry

Utilities live in `src/utils`. They own reusable logic, parsing, encoding, hashing, formatting, and browser utility behavior. Utilities should be focused and should not become hidden stores or UI components.

This registry is the first lookup table for reusable logic. If a capability exists here, use it before creating new helper logic.

The `Public API` column is a selection aid. The utility module's exported functions and types are the API contract.

| Utility | Path | Status | Responsibility | Public API | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `abi-utils` | `src/utils/abi/abi-utils.ts` | active | Parse, normalize, and derive UI-ready state from imported ABI | `parseAbiSource`, `deriveAbiState`, `getMethodOptions`, `getConstructorFields`, `methodExists`, `findMethod`, `resolveMethodTransport` | Settings, Build, Deploy | Raw ABI parsing belongs under `src/utils/abi`; UI consumes normalized ABI data |
| `build-args-utils` | `src/utils/build-args-utils.ts` | active | Prepare ABI-shaped build method arguments from the uploaded project folder payload | `createBuildProjectPayload`, `prepareBuildMethodArgs`, `prepareBuildMethodCall` | Build | Keeps selected ABI method inputs aligned with values sent to viem |
| `deploy-args-utils` | `src/utils/deploy-args-utils.ts` | active | Decode the selected build result and prepare ABI-shaped deploy method arguments | `prepareDeployMethodCall` | Deploy | Supports the lyquid-deployer `deploy(bytes,bytes,bytes32,bytes32,string,string)` flow without hard-coding method names |
| `hash-utils` | `src/utils/hash-utils.ts` | active | Compute deterministic deployment evidence hashes | `hashSource`, `hashConstructorInput`, `hashPayload` | Review, Deploy | Do not duplicate hashing in components |
| `file-utils` | `src/utils/file-utils.ts` | active | Read uploaded project metadata, validate folder uploads, build a folder path tree, and extract readonly TOML previews | `getProjectMetadata`, `readProjectArchive`, `analyzeProjectFiles` | Upload | Rejects empty uploads and uploads without TOML targets; do not persist `File` or `FileList` |
| `lyquid-id-utils` | `src/utils/lyquid-id-utils.ts` | active | Decode user-facing Lyquid IDs into their raw 20-byte payload address shape | `lyquidIdToAddress` | Tests, future validation | This is not the deployed EVM contract address for `eth_call.to`; request senders must resolve `GetLyquidInfo.contract` first |
| `endpoint-utils` | `src/utils/request/endpoint-utils.ts` | active | Rewrites browser RPC requests through the Vite dev proxy only in dev builds | `getRequestEndpoint` | Request senders, Lyquid info client | Keep production RPC URLs direct; do not hard-code local RPC ports |
| `browser-wallet-client` | `src/utils/request/browser-wallet-client.ts` | active | Wraps an injected browser wallet provider as the minimal wallet transaction client used by deploy | `createBrowserWalletTransactionClient` | Deploy page, on-chain sender | Use this when wagmi reports an account but `useWalletClient` is unavailable for a custom RPC chain |
| `lyquid-info-client` | `src/utils/request/lyquid-info-client.ts` | active | Resolves a Lyquid ID to its deployed contract address through `GetLyquidInfo` | `fetchLyquidContractAddress` | Off-chain sender, on-chain sender | Returns `null` when the Lyquid has no visible contract; throws detailed network/RPC errors |
| `rpc-chain-client` | `src/utils/request/rpc-chain-client.ts` | active | Fetches `eth_chainId` from the configured RPC and builds a viem chain for wallet transactions | `fetchRpcChain` | On-chain sender | Deploy must follow the user-provided RPC rather than the default wagmi chain |
| `rpc-transaction-client` | `src/utils/request/rpc-transaction-client.ts` | active | Fetches transaction details from the configured RPC by transaction hash | `fetchRpcTransaction` | On-chain sender | Used to populate Deploy tab transaction details without leaving the app |
| `download-utils` | `src/utils/download-utils.ts` | active | Download JSON payloads and results from the browser | `downloadJson` | Review, Deploy | Browser-only utility |
| `format-utils` | `src/utils/format-utils.ts` | active | Format hashes, addresses, and statuses for display | `shortHash`, `shortAddress`, `formatStatus` | UI components | Display-only; no business logic |
| `workbench-layout-utils` | `src/utils/workbench-layout-utils.ts` | active | Pure helpers for workbench pane layout ratios | `clampRatio` | Workbench layout components | Keep non-component exports outside React component files for fast refresh |

## Store Registry

Persistent and runtime stores live in `src/store`. Store modules own browser state boundaries and should not import UI components.

| Store | Path | Status | Responsibility | Public API | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `settings-store` | `src/store/settings-store.ts` | active | Persists RPC endpoint, Lyquid ID, ABI, Build Method, Deploy Method, and derived ABI state | `useSettingsStore` | Settings, Build, Deploy | Only settings are persisted here |
| `deploy-session-store` | `src/store/deploy-session-store.ts` | active | Holds legacy wizard runtime upload/build/review/deploy state | `useDeploySessionStore` | Legacy wizard components | Do not persist uploaded files or run outputs |
| `workbench-store` | `src/store/workbench-store.ts` | active | Persists compiler workbench layout ratios and latest 10 deploy history records | `useWorkbenchStore` | Workbench page | Does not persist uploaded files, current tabs, build payloads, tx details, or run raw output |

## Config Registry

Config modules live in `src/config`. Use this directory for constants, defaults, static options, route paths, storage keys, and deploy flow definitions.

Do not place reusable constants inside pages or components. Do not create `src/constants`.

The `Exports` column is a selection aid. The config module's actual exports are the API contract.

| Config | Path | Status | Responsibility | Exports | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `app-config` | `src/config/app-config.ts` | active | App-level product constants | `appName` | Layout, metadata | No runtime state |
| `routes-config` | `src/config/routes-config.ts` | active | Route paths and route labels | `routes` | Navigation, links | Includes `/` workbench and `/legacy` wizard paths; keep Vite page entry composition consistent |
| `deploy-steps-config` | `src/config/deploy-steps-config.ts` | active | Upload, Build, Review, Deploy step definitions | `deploySteps` | `ProgressSteps`, pages | Do not duplicate step labels in components |
| `storage-config` | `src/config/storage-config.ts` | active | Local storage keys and persisted store versions | `settingsStorageKey`, `settingsVersion`, `workbenchStorageKey`, `workbenchStorageVersion` | `settings-store`, `workbench-store` | Used by persisted stores only |
| `upload-config` | `src/config/upload-config.ts` | active | Upload limits and accepted source inputs | `acceptedProjectFormats`, `maxUploadSize` | Upload step, `file-utils` | Folder-first upload; keep UI and file handling aligned |
| `default-settings-config` | `src/config/default-settings-config.ts` | active | Default settings shown in Settings | `defaultSettings` | `settings-store`, `SettingsDialog` | Includes empty ABI defaults for the MVP |
| `workbench-config` | `src/config/workbench-config.ts` | active | Static workbench defaults and limits | `defaultWorkbenchLayout`, `deployHistoryLimit` | Workbench store, upload controls | No runtime state |
