# Cloud Deploy MVP Design

Date: 2026-05-15

## Summary

Cloud Deploy is a lightweight web tool for deploying Lyquid projects. It gives users a focused workflow to import a Lyquid ABI, configure the target RPC endpoint, upload a working directory, execute ABI-selected build and deploy methods, review the prepared output, and use a wallet to complete deployment or update.

The MVP is intentionally narrow. It is not an agent marketplace, a provenance protocol, a registry, or a broad Lyquid management console. It is a deployment utility.

## Goals

- Provide a single-page, progress-driven web tool for Lyquid deployment.
- Keep the visible workflow simple: upload, build, review, deploy.
- Let the imported ABI drive method options and request transport.
- Let users choose which ABI methods correspond to build and deploy.
- Support constructor parameters when the ABI declares them.
- Support create and update without an explicit deploy mode.
- Persist only user settings locally.
- Avoid introducing extra protocol objects beyond what the MVP needs.

## Non-Goals

- No agent marketplace, routing, reputation, staking, or registry design.
- No provenance protocol beyond the minimal hashes shown to the user.
- No separate backend endpoint or backend schema setting.
- No hard-coded method names such as `build`, `prepare`, or `deploy`.
- No semantic validation that the selected build/deploy methods are correct.
- No durable recovery guarantee for uploaded source, build results, prepared output, or deployment result.

## Product Shape

The app is a `100vh` single-page deploy console. The top bar contains the product name, wallet connection, and settings.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Cloud Deploy                         [Connect Wallet] [Settings]     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1 Upload  ->  2 Build  ->  3 Review  ->  4 Deploy                  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Current step content                                                │
│                                                                      │
│                                                  [Back] [Action]     │
└──────────────────────────────────────────────────────────────────────┘
```

Only the current step is shown. Users can move forward after completing the step and can go back to inspect or change earlier inputs.

## Technology

- React for the frontend application.
- Tailwind CSS for styling.
- shadcn/ui for dialogs, buttons, form controls, progress/stepper primitives, dropdowns, and toasts.
- Zustand for client state.
- `zustand.persist` for local settings persistence.
- wagmi for wallet connection and account state.
- viem for ABI parsing, encoding, chain calls, transaction submission, and result decoding.

## Settings

Settings are edited in a dialog. They are not part of the main progress content.

```text
┌──────────────────────────── Settings ────────────────────────────────┐
│                                                                      │
│  RPC Endpoint                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ https://...                                                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Lyquid ID                                                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ lyquid-...                                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ABI                                                                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ pasted / imported ABI JSON                                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  [Import ABI]                                                        │
│                                                                      │
│  Build Method                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ select method parsed from ABI                                v  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Deploy Method                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ select method parsed from ABI                                v  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                                      [Cancel] [Save Settings]        │
└──────────────────────────────────────────────────────────────────────┘
```

Persisted settings:

- `rpcEndpoint`
- `lyquidId`
- `abi`
- `buildMethod`
- `deployMethod`

The frontend may ship with default values in its initial state. The UI does not expose a separate default/import schema mode.

## ABI Method Selection

The imported ABI is the source of method options. After the ABI is parsed, the app populates the `Build Method` and `Deploy Method` dropdowns from the parsed callable methods.

The app does not infer which method is semantically correct. It does not block a user from selecting the wrong method. The selected method is sent according to the ABI. Any mismatch is surfaced by the wallet, RPC endpoint, off-chain endpoint, or Lyquid result.

The only coupling between ABI changes and selected methods is existence detection:

- When the ABI changes, if the current `buildMethod` value no longer exists in the parsed ABI method list, show an error: `Build method does not exist.`
- When the ABI changes, if the current `deployMethod` value no longer exists in the parsed ABI method list, show an error: `Deploy method does not exist.`
- Do not perform compatibility, type, semantic, transport, or build/deploy relationship validation.

## Request Dispatch

The frontend has two request senders:

- on-chain sender
- off-chain sender

The selected ABI method determines which sender is used and how the request is encoded. The page does not hard-code method names such as `build`, `prepare`, `deploy`, `publish`, or `register`.

On-chain sender:

- Encodes the selected ABI method with viem.
- Uses wagmi wallet state when a wallet signature or transaction is required.
- Sends transactions or calls through the configured `RPC Endpoint`.
- Decodes returned values, receipts, events, or errors according to the ABI and request result.

Off-chain sender:

- Builds the request according to the selected ABI method's off-chain request shape.
- Sends the request to the ABI-defined off-chain route through the configured RPC environment.
- Decodes the response according to the ABI and request result.
- If the ABI-defined flow requires wallet authorization, the sender first obtains the signature through the connected wallet and includes it in the off-chain request.

The MVP spec does not define a separate backend endpoint setting. Off-chain routing is part of the ABI-driven request flow.

## Constructor Parameters

Constructor parameters belong to the current deployment attempt, not global settings.

If the imported ABI declares constructor parameters:

- Step 2 renders constructor parameter inputs.
- The user provides values before running the build method.
- The provided values are encoded according to the ABI.
- The encoded constructor input participates in `constructorInputHash`.

If the imported ABI does not declare constructor parameters, the deployment is treated as a no-argument constructor flow.

The UI should collect and encode constructor inputs but should avoid broad semantic validation. Errors from invalid values are surfaced during encoding or request execution.

## Workflow

### Step 1: Upload

The user selects a Lyquid working directory or uploads a zip archive.

Display:

- project name
- file count
- total size

The selected source is runtime state. It is not persisted to local storage.

### Step 2: Build

The app reads the selected `Build Method` from settings.

If constructor parameters exist in the ABI, render constructor input fields before the build action.

When the user clicks `Build`:

- Encode the selected build request according to the ABI.
- Include the uploaded project and constructor inputs when required by the ABI method.
- Dispatch through the on-chain or off-chain sender declared by the ABI.
- Store the build result in runtime state.
- Derive or display available build evidence such as `sourceHash`, `artifactHash`, `constructorInputHash`, logs, prepared payload, or ABI-defined result fields.

### Step 3: Review

The review step lets the user inspect the output that will drive deployment.

Show available fields:

- `sourceHash`
- `artifactHash`
- `constructorInputHash`
- prepared payload, deploy input, or ABI-defined result

Actions:

- copy JSON
- download JSON
- proceed to deploy

The review step should show what is available without inventing missing fields.

### Step 4: Deploy

The app reads the selected `Deploy Method` from settings.

If `lyquidId` exists, clicking deploy opens an update confirmation dialog:

```text
Deploy as update to this Lyquid?
[Cancel] [Deploy as Update]
```

If `lyquidId` is empty, the flow proceeds as a create deployment.

When the user confirms deploy:

- Encode the selected deploy request according to the ABI.
- Include the reviewed build output and constructor-derived values when required by the ABI method.
- Dispatch through the on-chain or off-chain sender declared by the ABI.
- Use the connected wallet when the ABI-declared flow requires signing or transaction submission.
- Store the deploy result in runtime state.

Show available result fields:

- transaction hash
- Lyquid ID
- status
- `signedPayloadHash`
- raw result JSON

## State Model

Persisted settings:

- `rpcEndpoint`
- `lyquidId`
- `abi`
- `buildMethod`
- `deployMethod`

Runtime state:

- current step
- uploaded project metadata and file handles
- constructor parameter values
- build result
- review payload
- deploy result
- current errors

Only settings are stored with `zustand.persist`. Runtime state is allowed to disappear on refresh.

## Hashes And Version Consistency

The MVP keeps only the hashes needed to identify deployment-relevant content versions:

- `sourceHash`: identifies the uploaded or generated source snapshot when available.
- `artifactHash`: identifies the built Lyquid artifact, LDK image hash, or LyquidPack digest when available.
- `constructorInputHash`: identifies the constructor input values encoded for this deployment attempt.
- `signedPayloadHash`: identifies the final signed payload or deployment authorization when available.

Any source, artifact, constructor input, or signed payload change should produce a different corresponding hash. These hashes are displayed as evidence, not modeled as separate protocol objects.

Avoid extra task, package, authorization, or observation objects in the MVP.

## Storage And Recovery

Settings are persisted in local storage.

Uploaded source, build results, prepared output, deployment result, and logs are runtime data. They may be held by the page or by the selected off-chain flow during the active session, but the MVP does not promise durable recovery.

If intermediate data is lost because the page refreshes, the browser clears state, or an off-chain service cleans its storage, the user should repeat the upload/build/review/deploy flow as needed.

This is acceptable for the MVP because durable facts come from the chain, the Lyquid network, and retained artifact stores when they are part of the selected ABI flow. Temporary build and review data are reproducible inputs, not canonical state.

## Error Handling

Error handling should be direct and local:

- Invalid ABI JSON: show an import/parse error in Settings.
- Selected build method no longer exists after ABI change: show `Build method does not exist.`
- Selected deploy method no longer exists after ABI change: show `Deploy method does not exist.`
- Missing RPC endpoint when a request needs it: show a blocking step error.
- Wallet disconnected when a selected request needs wallet authorization: show connect wallet action.
- Request encoding failure: show the encoding error.
- On-chain failure: show wallet/RPC/receipt error.
- Off-chain failure: show the returned error and raw response when available.

The app should not add speculative validation beyond the boundaries above.

## Testing Scope

MVP testing should cover:

- Settings persistence through `zustand.persist`.
- ABI import and method dropdown population.
- ABI change existence detection for selected build/deploy methods.
- Constructor parameter rendering from ABI.
- Step navigation forward and backward.
- On-chain sender dispatch path with a mocked wagmi/viem client.
- Off-chain sender dispatch path with a mocked transport.
- Deploy update confirmation when `lyquidId` exists.
- Review display for available hash/result fields.

## Open Implementation Notes

- The exact ABI metadata shape for identifying on-chain versus off-chain method dispatch should come from the Lyquid ABI used by the project.
- The frontend should keep the dispatch layer small: resolve selected method, pick sender from ABI metadata, encode, send, decode.
- The UI should remain a tool surface, not a documentation page.
