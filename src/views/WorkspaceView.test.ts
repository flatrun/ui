import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkspaceView from "./WorkspaceView.vue";
import membersFixture from "@/model/fixtures/members.json";
import invitationsFixture from "@/model/fixtures/invitations.json";
import { workspacesApi } from "@/services/api";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Workspace } from "@/types";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    workspacesApi: {
      list: vi.fn(),
      members: vi.fn(),
      invitations: vi.fn(),
      addMember: vi.fn(),
      setRole: vi.fn(),
      removeMember: vi.fn(),
      invite: vi.fn(),
      revokeInvitation: vi.fn(),
      accept: vi.fn(),
    },
  };
});

const acme: Workspace = {
  id: 4,
  slug: "acme-shop",
  name: "Acme Shop",
  personal: false,
  created_at: "2026-10-22T19:14:19.305099867Z",
  role: "owner",
};

async function mountAs(role: Workspace["role"]) {
  setActivePinia(createPinia());
  const store = useWorkspaceStore();
  store.workspaces = [{ ...acme, role }];
  store.select("acme-shop");
  const wrapper = mount(WorkspaceView, { global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } } });
  await flushPromises();
  return wrapper;
}

describe("WorkspaceView", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(workspacesApi.members).mockResolvedValue({ data: membersFixture } as any);
    vi.mocked(workspacesApi.invitations).mockResolvedValue({ data: invitationsFixture } as any);
  });

  it("lets an owner add members and invite people", async () => {
    vi.mocked(workspacesApi.addMember).mockResolvedValue({ data: {} } as any);
    vi.mocked(workspacesApi.invite).mockResolvedValue({
      data: { invitation: invitationsFixture.items[0], token: "invite-code" },
    } as any);
    const wrapper = await mountAs("owner");

    expect(wrapper.get("h1").text()).toBe("Acme Shop");
    expect(wrapper.findAll(".who strong").map((w) => w.text())).toEqual(["shots", "dana@example.com"]);

    const [addForm, inviteForm] = wrapper.findAll("form.add");
    await addForm.get("input").setValue("ops");
    await addForm.get("select").setValue("admin");
    await addForm.trigger("submit");
    await flushPromises();
    expect(workspacesApi.addMember).toHaveBeenCalledWith("acme-shop", "ops", "admin");

    await inviteForm.get("input").setValue("dana@example.com");
    await inviteForm.trigger("submit");
    await flushPromises();
    expect(workspacesApi.invite).toHaveBeenCalledWith("acme-shop", "dana@example.com", "member");
    expect(wrapper.get(".token code").text()).toBe("invite-code");
  });

  it("shows a member the roster without management controls", async () => {
    const wrapper = await mountAs("member");
    expect(wrapper.findAll(".who strong").map((w) => w.text())).toEqual(["shots"]);
    expect(wrapper.find("select").exists()).toBe(false);
    expect(workspacesApi.invitations).not.toHaveBeenCalled();
  });

  it("reports the agent's refusal", async () => {
    vi.mocked(workspacesApi.removeMember).mockRejectedValue({
      response: { data: { error: "a workspace needs at least one owner" } },
    });
    const wrapper = await mountAs("owner");
    await wrapper.get(".icon-btn").trigger("click");
    await flushPromises();
    expect(wrapper.get(".error").text()).toBe("a workspace needs at least one owner");
  });
});
