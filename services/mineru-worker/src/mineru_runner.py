"""
Stub MinerU runner — swap for real MinerU CLI / library integration.

Production: download PDF, run MinerU, write outputs under output_base_path in Storage.
"""

from dataclasses import dataclass


@dataclass
class StubMinerUResult:
    output_base_path: str
    message: str = "stub_complete"


def run_mineru_stub(*, output_base_path: str) -> StubMinerUResult:
    return StubMinerUResult(output_base_path=output_base_path)
