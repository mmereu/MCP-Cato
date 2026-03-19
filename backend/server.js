const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { GraphQLClient } = require("graphql-request");
require("dotenv").config();

const app = express();

app.use(helmet());
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["http://localhost:5173"];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json());

const catoClient = new GraphQLClient(
  process.env.CATO_ENDPOINT || "https://api.catonetworks.com/api/v1/graphql2",
  { headers: { "x-api-key": process.env.CATO_API_KEY, "Content-Type": "application/json" }, timeout: 30000 }
);

console.log("Account ID:", process.env.CATO_ACCOUNT_ID);

// ==================== MCP CLIENT ====================
let mcpClient = null;
let mcpTools = [];
let mcpStatus = "disconnected";

async function initMCPClient() {
  try {
    mcpStatus = "connecting";
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");

    const transport = new StreamableHTTPClientTransport(
      new URL(process.env.CATO_MCP_URL || "https://api.catonetworks.com/api/v1/rest/mcp"),
      {
        requestInit: {
          headers: {
            "x-api-key": process.env.CATO_API_KEY,
          },
        },
      }
    );

    mcpClient = new Client({ name: "cato-webapp", version: "1.0.0" });
    await mcpClient.connect(transport);

    const result = await mcpClient.listTools();
    mcpTools = result.tools;
    mcpStatus = "connected";
    console.log("MCP connected. Tools available:", mcpTools.length);
    mcpTools.forEach(t => console.log("  -", t.name));
  } catch (error) {
    mcpStatus = "error";
    console.error("MCP connection failed:", error.message);
  }
}

// MCP endpoints
app.get("/api/mcp/status", (req, res) => {
  res.json({
    success: true,
    data: { status: mcpStatus, toolCount: mcpTools.length },
  });
});

app.get("/api/mcp/tools", (req, res) => {
  if (mcpStatus !== "connected") {
    return res.status(503).json({ error: "MCP not connected", status: mcpStatus });
  }
  res.json({
    success: true,
    data: mcpTools.map((t) => ({
      name: t.name,
      description: t.description || "",
      inputSchema: t.inputSchema,
    })),
  });
});

app.post("/api/mcp/call", async (req, res) => {
  if (mcpStatus !== "connected" || !mcpClient) {
    return res.status(503).json({ error: "MCP not connected", status: mcpStatus });
  }

  const { toolName, arguments: args } = req.body;
  if (!toolName) {
    return res.status(400).json({ error: "toolName is required" });
  }

  const tool = mcpTools.find((t) => t.name === toolName);
  if (!tool) {
    return res.status(404).json({ error: "Tool not found: " + toolName });
  }

  try {
    console.log("MCP call:", toolName, JSON.stringify(args || {}));
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: args || {},
    });
    console.log("MCP result:", JSON.stringify(result).substring(0, 500));

    // Enrich Q_singleUsersLegacyGroup with real member count
    if (toolName === "Q_singleUsersLegacyGroup" && !result.isError && result.content?.[0]?.text) {
      try {
        const groupData = JSON.parse(result.content[0].text);
        const groupId = groupData.singleUsersLegacyGroup?.id || groupData.singleUsersLegacyGroup?.protoId;
        if (groupId) {
          const membersResult = await mcpClient.callTool({
            name: "Q_usersGroupMembers",
            arguments: { groupID: groupId, importType: "REGULAR" },
          });
          if (!membersResult.isError && membersResult.content?.[0]?.text) {
            const membersData = JSON.parse(membersResult.content[0].text);
            const realCount = membersData.usersGroupMembers?.total || 0;
            const members = membersData.usersGroupMembers?.items || [];
            groupData.singleUsersLegacyGroup.amountOfUsers = realCount;
            groupData.singleUsersLegacyGroup.members = members;
            result.content[0].text = JSON.stringify(groupData);
            console.log("Enriched group with real member count:", realCount);
          }
        }
      } catch (enrichErr) {
        console.error("Error enriching group data:", enrichErr.message);
      }
    }

    // Auto-paginate Q_vpnUsersDirectory to fetch ALL users beyond 500 limit
    if (toolName === "Q_vpnUsersDirectory" && !result.isError && result.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(result.content[0].text);
        const dir = parsed.vpnUsersDirectory;
        if (dir && dir.total > dir.items.length) {
          const allItems = [...dir.items];
          const pageSize = dir.items.length || 500;
          let offset = pageSize;
          while (offset < dir.total) {
            const pageArgs = { ...(args || {}), limit: pageSize, from: offset };
            if (!pageArgs.accountID) pageArgs.accountID = "auto";
            const pageResult = await mcpClient.callTool({ name: toolName, arguments: pageArgs });
            if (!pageResult.isError && pageResult.content?.[0]?.text) {
              const pageData = JSON.parse(pageResult.content[0].text);
              const pageItems = pageData.vpnUsersDirectory?.items || [];
              allItems.push(...pageItems);
              console.log("Auto-paginate vpnUsersDirectory: fetched", allItems.length, "/", dir.total);
              if (pageItems.length === 0) break;
            } else {
              break;
            }
            offset += pageSize;
          }
          dir.items = allItems;
          dir.total = allItems.length;
          parsed.vpnUsersDirectory = dir;
          result.content[0].text = JSON.stringify(parsed);
          console.log("Auto-paginated vpnUsersDirectory: total", allItems.length, "users");
        }
      } catch (pagErr) {
        console.error("Error auto-paginating vpnUsersDirectory:", pagErr.message);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("MCP call error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mcp/reconnect", async (req, res) => {
  try {
    if (mcpClient) {
      try { await mcpClient.close(); } catch (e) {}
    }
    mcpClient = null;
    mcpTools = [];
    await initMCPClient();
    res.json({ success: true, status: mcpStatus, toolCount: mcpTools.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXISTING ROUTES ====================
app.get("/api/health", (req, res) => { res.json({ status: "ok", mcpStatus }); });

app.get("/api/sites", async (req, res) => {
  try {
    const query = "query getSites($accountID: ID!) { entityLookup(accountID: $accountID, type: site) { items { entity { id name } description } } }";
    const data = await catoClient.request(query, { accountID: process.env.CATO_ACCOUNT_ID });
    const sites = data.entityLookup.items.map((item) => ({
      id: item.entity.id,
      name: item.entity.name,
      description: item.description || ""
    }));
    res.json({ success: true, data: sites });
  } catch (error) {
    console.error("GET /api/sites ERROR:", error.response?.errors || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sites", async (req, res) => {
  console.log("POST /api/sites - Body:", JSON.stringify(req.body, null, 2));
  try {
    const { name, siteType, connectionType, nativeNetworkRange, siteLocation, description, translatedSubnet, vlan } = req.body;
    if (!name || !siteType || !connectionType || !nativeNetworkRange || !siteLocation) {
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }
    const mutation = "mutation addSocketSite($accountId: ID!, $input: AddSocketSiteInput!) { site(accountId: $accountId) { addSocketSite(input: $input) { siteId } } }";
    const variables = {
      accountId: process.env.CATO_ACCOUNT_ID,
      input: {
        name, siteType, connectionType, nativeNetworkRange,
        siteLocation: {
          countryCode: siteLocation.countryCode.toUpperCase(),
          timezone: siteLocation.timezone,
          ...(siteLocation.stateCode && { stateCode: siteLocation.stateCode }),
          ...(siteLocation.city && { city: siteLocation.city }),
          ...(siteLocation.address && { address: siteLocation.address })
        },
        ...(description && { description }),
        ...(translatedSubnet && { translatedSubnet }),
        ...(vlan && { vlan: parseInt(vlan) })
      }
    };
    const data = await catoClient.request(mutation, variables);
    res.status(201).json({ success: true, data: { siteId: data.site.addSocketSite.siteId, name } });
  } catch (error) {
    console.error("POST /api/sites ERROR:", error.response?.errors || error.message);
    res.status(400).json({ error: "Cato API Error", message: error.response?.errors?.[0]?.message || error.message });
  }
});

app.get("/api/sites/:siteId/lan-interface", async (req, res) => {
  try {
    const { siteId } = req.params;
    const query = "query entityLookup($accountID: ID!, $type: EntityType!, $parent: EntityInput!) { entityLookup(accountID: $accountID, type: $type, parent: $parent) { items { entity { id name type } } } }";
    const data = await catoClient.request(query, { accountID: process.env.CATO_ACCOUNT_ID, type: "networkInterface", parent: { id: siteId, type: "site" } });
    const lanInterface = data.entityLookup.items.find(item => item.entity.name.includes("LAN") || item.entity.type === "lanSocketInterface");
    if (!lanInterface) return res.status(404).json({ error: "LAN interface not found" });
    res.json({ success: true, data: { interfaceId: lanInterface.entity.id, name: lanInterface.entity.name } });
  } catch (error) {
    console.error("GET /api/sites/:siteId/lan-interface ERROR:", error.response?.errors || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sites/:siteId/network-ranges", async (req, res) => {
  try {
    const { siteId } = req.params;
    const { interfaceId, vlanConfig } = req.body;
    const mutation = "mutation addNetworkRange($accountId: ID!, $lanSocketInterfaceId: ID!, $input: AddNetworkRangeInput!) { site(accountId: $accountId) { addNetworkRange(lanSocketInterfaceId: $lanSocketInterfaceId, input: $input) { networkRangeId } } }";
    const dhcpSettings = vlanConfig.dhcpType === "DHCP_RANGE" && vlanConfig.dhcpRange ? { dhcpType: "DHCP_RANGE", ipRange: vlanConfig.dhcpRange } : { dhcpType: "DHCP_DISABLED" };
    const variables = { accountId: process.env.CATO_ACCOUNT_ID, lanSocketInterfaceId: interfaceId, input: { name: vlanConfig.name, rangeType: "VLAN", subnet: vlanConfig.subnet, localIp: vlanConfig.localIp, vlan: vlanConfig.vlanId, dhcpSettings } };
    const data = await catoClient.request(mutation, variables);
    res.status(201).json({ success: true, data: { networkRangeId: data.site.addNetworkRange.networkRangeId } });
  } catch (error) {
    console.error("POST /api/sites/:siteId/network-ranges ERROR:", error.response?.errors || error.message);
    res.status(400).json({ error: error.response?.errors?.[0]?.message || error.message });
  }
});

app.post("/api/sites/create-complete", async (req, res) => {
  console.log("POST /api/sites/create-complete - Body:", JSON.stringify(req.body, null, 2));
  try {
    const { name, siteType, connectionType, description, siteLocation, nativeNetwork, vlans = [] } = req.body;
    const siteMutation = "mutation addSocketSite($accountId: ID!, $input: AddSocketSiteInput!) { site(accountId: $accountId) { addSocketSite(input: $input) { siteId } } }";
    const siteVariables = { accountId: process.env.CATO_ACCOUNT_ID, input: { name, siteType, connectionType, nativeNetworkRange: nativeNetwork.nativeNetworkRange, siteLocation: { countryCode: siteLocation.countryCode.toUpperCase(), timezone: siteLocation.timezone }, ...(description && { description }), ...(nativeNetwork.translatedSubnet && { translatedSubnet: nativeNetwork.translatedSubnet }) } };
    const siteData = await catoClient.request(siteMutation, siteVariables);
    const siteId = siteData.site.addSocketSite.siteId;
    const lookupQuery = "query entityLookup($accountID: ID!, $type: EntityType!, $parent: EntityInput!) { entityLookup(accountID: $accountID, type: $type, parent: $parent) { items { entity { id name type } } } }";
    const interfaceData = await catoClient.request(lookupQuery, { accountID: process.env.CATO_ACCOUNT_ID, type: "networkInterface", parent: { id: siteId, type: "site" } });
    const lanInterface = interfaceData.entityLookup.items.find(item => item.entity.name.includes("LAN") || item.entity.type === "lanSocketInterface");
    if (!lanInterface) throw new Error("LAN interface not found after site creation");
    const interfaceId = lanInterface.entity.id;
    const rangeData2 = await catoClient.request(lookupQuery, { accountID: process.env.CATO_ACCOUNT_ID, type: "siteRange", parent: { id: siteId, type: "site" } });
    const nativeRange = rangeData2.entityLookup.items.find(item => item.entity.name === "Native" || item.entity.type === "native" || item.entity.name.toLowerCase().includes("native"));
    let nativeRangeId = null;
    if (nativeRange && nativeNetwork.localIp) {
      nativeRangeId = nativeRange.entity.id;
      const updateRangeMutation = "mutation updateNetworkRange($accountId: ID!, $networkRangeId: ID!, $input: UpdateNetworkRangeInput!) { site(accountId: $accountId) { updateNetworkRange(networkRangeId: $networkRangeId, input: $input) { networkRangeId } } }";
      const nativeDhcpSettings = nativeNetwork.dhcpType === "DHCP_RANGE" && nativeNetwork.dhcpRange ? { dhcpType: "DHCP_RANGE", ipRange: nativeNetwork.dhcpRange } : { dhcpType: "DHCP_DISABLED" };
      try { await catoClient.request(updateRangeMutation, { accountId: process.env.CATO_ACCOUNT_ID, networkRangeId: nativeRangeId, input: { localIp: nativeNetwork.localIp, dhcpSettings: nativeDhcpSettings } }); } catch (e) { console.error("Error updating native IP:", e.message); }
    }
    if (vlans.length === 0) return res.status(201).json({ success: true, data: { siteId, interfaceId, nativeRangeId, vlanResults: [] } });
    const rangeMutation = "mutation addNetworkRange($accountId: ID!, $lanSocketInterfaceId: ID!, $input: AddNetworkRangeInput!) { site(accountId: $accountId) { addNetworkRange(lanSocketInterfaceId: $lanSocketInterfaceId, input: $input) { networkRangeId } } }";
    const vlanResults = [];
    for (const vlan of vlans) {
      try {
        const dhcpSettings = vlan.dhcpType === "DHCP_RANGE" && vlan.dhcpRange ? { dhcpType: "DHCP_RANGE", ipRange: vlan.dhcpRange } : { dhcpType: "DHCP_DISABLED" };
        const rd = await catoClient.request(rangeMutation, { accountId: process.env.CATO_ACCOUNT_ID, lanSocketInterfaceId: interfaceId, input: { name: vlan.name, rangeType: "VLAN", subnet: vlan.subnet, localIp: vlan.localIp, vlan: vlan.vlanId, dhcpSettings } });
        vlanResults.push({ vlanId: vlan.vlanId, name: vlan.name, networkRangeId: rd.site.addNetworkRange.networkRangeId, success: true });
      } catch (vlanError) {
        vlanResults.push({ vlanId: vlan.vlanId, name: vlan.name, success: false, error: vlanError.response?.errors?.[0]?.message || vlanError.message });
      }
    }
    res.status(201).json({ success: true, data: { siteId, interfaceId, nativeRangeId, vlanResults }, message: "Site created with " + vlanResults.filter(v => v.success).length + "/" + vlans.length + " VLANs" });
  } catch (error) {
    console.error("POST /api/sites/create-complete ERROR:", error.response?.errors || error.message);
    res.status(400).json({ error: "Site creation failed", message: error.response?.errors?.[0]?.message || error.message });
  }
});

app.get("/api/locations", async (req, res) => {
  try {
    const { search, field = "country" } = req.query;
    const query = "query siteLocation($accountID: ID!, $filters: [SiteLocationFilterInput!]) { siteLocation(accountID: $accountID, filters: $filters) { country { code name } state { code name } city { name } timezone } }";
    const filters = search ? [{ search, field, operation: "contains" }] : [];
    const data = await catoClient.request(query, { accountID: process.env.CATO_ACCOUNT_ID, filters });
    res.json({ success: true, data: data.siteLocation });
  } catch (error) {
    console.error("GET /api/locations ERROR:", error.response?.errors || error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== START ====================
const PORT = process.env.PORT || 3001;

initMCPClient().then(() => {
  app.listen(PORT, () => console.log("Server on port " + PORT));
}).catch((err) => {
  console.error("MCP init error (starting anyway):", err.message);
  app.listen(PORT, () => console.log("Server on port " + PORT + " (MCP unavailable)"));
});
