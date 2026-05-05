from typing import Any, Union

from pydantic import BaseModel


class PreviewResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, str]]


class DiagnosticIssue(BaseModel):
    code: str
    rows: Union[list[int], str]
    msg: str
    data: dict[str, Any] | None = None


class DiagnosticSummary(BaseModel):
    totalRows: int
    productCount: int
    variantCount: int
    errorsCount: int
    warningsCount: int


class NonStandardHeader(BaseModel):
    source: str
    suggested: str | None


class DiffEntry(BaseModel):
    row: int
    changeType: str
    field: str
    before: str
    after: str
    context: str


class DiagnosticReport(BaseModel):
    summary: DiagnosticSummary
    issues: list[DiagnosticIssue]
    nonStandardHeaders: list[NonStandardHeader]
    handleFixes: dict[str, str]
    diffPreview: list[DiffEntry]
