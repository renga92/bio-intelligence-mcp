export async function handleGetCompanyDeepDive(args: any, callTool: (name: string, a: any) => Promise<any>) {
    const { company } = args;

    const [pipelineRes, velocityRes, geoRes] = await Promise.all([
        callTool("get_pipeline", { company }),
        callTool("get_conversion_velocity", { company }),
        callTool("get_geographic_intelligence", { condition: company }) // Reusing tool by passing company as term
    ]);

    // get_success_rates without condition gives overall Phase 3 success for company
    const successRes = await callTool("get_success_rates", { company });

    let report = `🏢 Company Deep Dive: ${company}\n`;
    report += `==============================================\n\n`;

    report += `[1] Technical Success (PoS)\n`;
    if (successRes.content && !successRes.isError) report += successRes.content[0].text + `\n\n`;

    report += `[2] Phase 3 Pipeline Focus\n`;
    if (pipelineRes.content && !pipelineRes.isError) report += pipelineRes.content[0].text + `\n\n`;

    report += `[3] Success Velocity (P1 -> P3)\n`;
    if (velocityRes.content && !velocityRes.isError) report += velocityRes.content[0].text + `\n\n`;

    report += `[4] Geographic Footprint\n`;
    if (geoRes.content && !geoRes.isError) report += geoRes.content[0].text + `\n\n`;

    return {
        content: [{ type: "text", text: report }]
    };
}
