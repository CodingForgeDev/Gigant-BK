const express = require("express");
const { Octokit } = require("octokit");
const auth = require("../middleware/auth");
const ActivityLog = require("../models/ActivityLog");

const router = express.Router();

function getOctokit(admin) {
  const token = admin.githubToken || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("No GitHub token configured");
  return new Octokit({ auth: token });
}

router.get("/repos", auth, async (req, res) => {
  try {
    const octokit = getOctokit(req.admin);
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
    const octokit = getOctokit(req.admin);
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
    const octokit = getOctokit(req.admin);
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
    const octokit = getOctokit(req.admin);
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
      const octokit = getOctokit(req.admin);
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
    const octokit = getOctokit(req.admin);
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

router.get("/activity", auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("performedBy", "name email");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
