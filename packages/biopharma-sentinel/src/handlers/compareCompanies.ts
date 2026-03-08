export async function handleCompareCompanies(args: any, callTool: (name: string, a: any) => Promise<any>) {
    const { company_a, company_b, condition } = args;

    const [compA_success, compB_success, compA_pipeline, compB_pipeline, compA_velocity, compB_velocity] = await Promise.all([
        callTool("get_success_rates", { company: company_a, condition }),
        callTool("get_success_rates", { company: company_b, condition }),
        callTool("get_pipeline", { company: company_a }),
        callTool("get_pipeline", { company: company_b }),
        callTool("get_conversion_velocity", { company: company_a }),
        callTool("get_conversion_velocity", { company: company_b })
    ]);

    let report = `⚔️ Head-to-Head: ${company_a} vs ${company_b}${condition ? ` in ${condition}` : ""}\n`;
    report += `========================================================\n\n`;

    report += `[1] Technical Success (PoS)\n`;
    report += `${company_a}:\n${compA_success.content?.[0]?.text || "No data"}\n\n`;
    report += `${company_b}:\n${compB_success.content?.[0]?.text || "No data"}\n\n`;

    report += `[2] Phase 3 Pipeline Breadth\n`;
    report += `${company_a}:\n${compA_pipeline.content?.[0]?.text || "No data"}\n\n`;
    report += `${company_b}:\n${compB_pipeline.content?.[0]?.text || "No data"}\n\n`;

    report += `[3] Success Velocity (P1 -> P3)\n`;
    report += `${company_a}:\n${compA_velocity.content?.[0]?.text || "No data"}\n\n`;
    report += `${company_b}:\n${compB_velocity.content?.[0]?.text || "No data"}\n\n`;

    return { content: [{ type: "text", text: report }] };
}
