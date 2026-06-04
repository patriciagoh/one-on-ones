import { useNavigate } from "react-router-dom";
import { Masthead } from "./Masthead";
import { ReportForm } from "./ReportForm";
import type { ReportFields } from "../domain/types";

export function NewReportScreen({ onAdd }: { onAdd: (f: ReportFields) => string | undefined }) {
  const navigate = useNavigate();
  return (
    <>
      <Masthead />
      <main id="main" className="max-w-content mx-auto px-6 py-8">
        <h1 className="font-sans font-bold text-2xl text-ink mb-6">Add a report</h1>
        <ReportForm
          mode="add"
          onSubmit={(f) => {
            const id = onAdd(f);
            if (id) navigate(`/person/${id}`);
          }}
        />
      </main>
    </>
  );
}
