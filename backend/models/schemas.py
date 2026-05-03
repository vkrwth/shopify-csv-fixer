from pydantic import BaseModel


class PreviewResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, str]]
