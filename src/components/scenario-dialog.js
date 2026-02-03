import { useMemo, useState } from "react";
import { useAccount, useToken } from "@/stores/account-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createScenario } from "@/api/scenario-api";

// admin/planner만 생성 가능하게 (원하면 여기서 빼도 됨)
function canEdit(role) {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "planner";
}

export function ScenarioDialog({ onCreated }) {
  const token = useToken((s) => s.token);
  const account = useAccount((s) => s.account);
  const role = account?.role;

  const editable = useMemo(() => canEdit(role), [role]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [desc, setDesc] = useState("");
  const [jobCount, setJobCount] = useState("");

  const reset = () => {
    setDesc("");
    setJobCount("");
  };

  const submit = async () => {
    if (!editable) return;

    const description = desc.trim();
    const jc = Number(jobCount);

    if (!description) {
      alert("설명을 입력해줘.");
      return;
    }
    if (Number.isNaN(jc) || jc < 0) {
      alert("Job Count는 0 이상 숫자로 입력해줘.");
      return;
    }

    setSaving(true);
    try {
      await createScenario({ description, jobCount: jc }, token);
      setOpen(false);
      reset();
      onCreated?.();
    } catch (e) {
      console.error(e);
      alert(e?.message || "시나리오 생성 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="text-sm text-muted-foreground">
        시나리오를 만들고 Run으로 시뮬레이션을 실행하세요.
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button disabled={!editable}>시나리오 생성</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>시나리오 생성</DialogTitle>
            <DialogDescription>
              description / jobCount 입력 후 생성
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>설명 (Description)</Label>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="예: 라인 설계 검증용 시나리오(step2)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Job Count</Label>
              <Input
                type="number"
                value={jobCount}
                onChange={(e) => setJobCount(e.target.value)}
                placeholder="예: 42"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={submit} disabled={saving || !editable}>
              {saving ? "생성중..." : "생성"}
            </Button>
          </DialogFooter>

          {!editable && (
            <div className="text-xs text-red-500 mt-2">
              admin / planner만 생성 가능합니다.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
