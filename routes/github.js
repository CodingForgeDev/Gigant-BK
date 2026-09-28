const express = require("express");
const { Octokit } = require("octokit");
const auth = require("../middleware/auth");
const ActivityLog = require("../models/ActivityLog");
const Organization = require("../models/Organization");

const router = express.Router();

function getOctokit(admin, orgToken) {
  const token = orgToken || admin.githubToken || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GitHub token configured");
  return new Octokit({ auth: token });
}

async function resolveOctokit(req) {
  const orgId = req.query.organizationId || req.body?.organizationId;
  if (orgId) {
    const org = await Organization.findById(orgId);
    if (org?.githubToken) return getOctokit(req.admin, org.githubToken);
  }
  return getOctokit(req.admin);
}

router.get("/rate-limit", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const { data } = await octokit.request("GET /rate_limit");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/repos", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const repos = await octokit.paginate("GET /user/repos", {
      per_page: 100,
      affiliation: "owner",
    });
    res.json(
      repos.map((r) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        html_url: r.html_url,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/repos/:owner/:repo/collaborators", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const { owner, repo } = req.params;
    const collaborators = await octokit.paginate(
      "GET /repos/{owner}/{repo}/collaborators",
      { owner, repo, per_page: 100 }
    );
    res.json(
      collaborators.map((c) => ({
        id: c.id,
        login: c.login,
        avatar_url: c.avatar_url,
        permissions: c.permissions,
        role_name: c.role_name,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/repos/:owner/:repo/invitations", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const { owner, repo } = req.params;
    const invitations = await octokit.paginate(
      "GET /repos/{owner}/{repo}/invitations",
      { owner, repo, per_page: 100 }
    );
    res.json(
      invitations.map((inv) => ({
        id: inv.id,
        login: inv.invitee?.login,
        avatar_url: inv.invitee?.avatar_url,
        permissions: inv.permissions,
        created_at: inv.created_at,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/collaborators/all", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const repos = await octokit.paginate("GET /user/repos", {
      per_page: 100,
      affiliation: "owner",
    });

    const collabMap = new Map();

    for (const repo of repos) {
      try {
        const [collaborators, invitations] = await Promise.all([
          octokit.paginate("GET /repos/{owner}/{repo}/collaborators", {
            owner: repo.owner.login,
            repo: repo.name,
            per_page: 100,
          }),
          octokit.paginate("GET /repos/{owner}/{repo}/invitations", {
            owner: repo.owner.login,
            repo: repo.name,
            per_page: 100,
          }),
        ]);

        for (const c of collaborators) {
          if (c.login === repo.owner.login) continue;
          if (!collabMap.has(c.login)) {
            collabMap.set(c.login, {
              login: c.login,
              avatar_url: c.avatar_url,
              repos: [],
            });
          }
          collabMap.get(c.login).repos.push({
            name: repo.full_name,
            permissions: c.permissions,
            role_name: c.role_name,
            type: "collaborator",
          });
        }

        for (const inv of invitations) {
          const login = inv.invitee?.login || `invite-${inv.id}`;
          if (!collabMap.has(login)) {
            collabMap.set(login, {
              login,
              avatar_url: inv.invitee?.avatar_url,
              repos: [],
            });
          }
          collabMap.get(login).repos.push({
            name: repo.full_name,
            permissions: inv.permissions,
            type: "invitation",
            invitation_id: inv.id,
          });
        }
      } catch {
        // skip repos where we can't list collaborators
      }
    }

    await ActivityLog.create({
      action: "list_collaborators",
      details: `Listed all collaborators across ${repos.length} repos`,
      performedBy: req.admin._id,
    });

    res.json(Array.from(collabMap.values()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete(
  "/repos/:owner/:repo/collaborators/:username",
  auth,
  async (req, res) => {
    try {
      const octokit = await resolveOctokit(req);
      const { owner, repo, username } = req.params;
      await octokit.request(
        "DELETE /repos/{owner}/{repo}/collaborators/{username}",
        { owner, repo, username }
      );

      await ActivityLog.create({
        action: "remove_collaborator",
        details: `Removed ${username} from ${owner}/${repo}`,
        targetUser: username,
        targetRepos: [`${owner}/${repo}`],
        performedBy: req.admin._id,
      });

      res.json({ message: `Removed ${username} from ${owner}/${repo}` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post("/collaborators/remove-bulk", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const { username, repos } = req.body;
    const results = [];

    for (const repoFullName of repos) {
      const [owner, repo] = repoFullName.split("/");
      try {
        await octokit.request(
          "DELETE /repos/{owner}/{repo}/collaborators/{username}",
          { owner, repo, username }
        );
        results.push({ repo: repoFullName, success: true });
      } catch (err) {
        results.push({
          repo: repoFullName,
          success: false,
          error: err.message,
        });
      }
    }

    await ActivityLog.create({
      action: "remove_collaborator",
      details: `Bulk removed ${username} from ${repos.length} repos`,
      targetUser: username,
      targetRepos: repos,
      performedBy: req.admin._id,
    });

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete(
  "/repos/:owner/:repo/invitations/:invitation_id",
  auth,
  async (req, res) => {
    try {
      const octokit = await resolveOctokit(req);
      const { owner, repo, invitation_id } = req.params;
      await octokit.request(
        "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}",
        { owner, repo, invitation_id: Number(invitation_id) }
      );

      await ActivityLog.create({
        action: "revoke_invitation",
        details: `Revoked invitation #${invitation_id} in ${owner}/${repo}`,
        targetRepos: [`${owner}/${repo}`],
        performedBy: req.admin._id,
      });

      res.json({ message: "Invitation revoked" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.put(
  "/repos/:owner/:repo/collaborators/:username",
  auth,
  async (req, res) => {
    try {
      const octokit = await resolveOctokit(req);
      const { owner, repo, username } = req.params;
      const { permission } = req.body;
      await octokit.request(
        "PUT /repos/{owner}/{repo}/collaborators/{username}",
        { owner, repo, username, permission: permission || "push" }
      );

      await ActivityLog.create({
        action: "add_collaborator",
        details: `Invited ${username} to ${owner}/${repo} with ${permission || "push"} access`,
        targetUser: username,
        targetRepos: [`${owner}/${repo}`],
        performedBy: req.admin._id,
      });

      res.json({ message: `Invited ${username} to ${owner}/${repo}` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

router.post("/collaborators/remove-bulk-users", auth, async (req, res) => {
  try {
    const octokit = await resolveOctokit(req);
    const { usernames, repos } = req.body;
    const results = [];

    for (const username of usernames) {
      for (const repoFullName of repos) {
        const [owner, repo] = repoFullName.split("/");
        try {
          await octokit.request(
            "DELETE /repos/{owner}/{repo}/collaborators/{username}",
            { owner, repo, username }
          );
          results.push({ username, repo: repoFullName, success: true });
        } catch (err) {
          results.push({
            username,
            repo: repoFullName,
            success: false,
            error: err.message,
          });
        }
      }
    }

    await ActivityLog.create({
      action: "remove_collaborator",
      details: `Batch removed ${usernames.length} users from ${repos.length} repos`,
      targetUser: usernames.join(", "),
      targetRepos: repos,
      performedBy: req.admin._id,
    });

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/activity", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("performedBy", "name email"),
      ActivityLog.countDocuments(),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/activity/export", auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .populate("performedBy", "name email");

    const header = "Date,Action,Details,Target User,Target Repos,Performed By";
    const rows = logs.map((l) => {
      const date = new Date(l.createdAt).toISOString();
      const escapeCsv = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
      return [
        date,
        l.action,
        escapeCsv(l.details),
        l.targetUser || "",
        escapeCsv((l.targetRepos || []).join("; ")),
        l.performedBy?.name || l.performedBy?.email || "",
      ].join(",");
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=activity-log.csv");
    res.send([header, ...rows].join("\n"));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
