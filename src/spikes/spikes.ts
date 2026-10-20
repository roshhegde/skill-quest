// Phase 0 spikes: can the libraries later tracks depend on run inside Pyodide?
// Each one installs packages from PyPI in the browser, then runs a small script
// that prints PASSED on success.

export type Spike = {
  id: string;
  title: string;
  why: string;
  packages: string[];
  code: string;
};

export const SPIKES: Spike[] = [
  {
    id: "moto",
    title: "moto + boto3 (AWS code labs)",
    why: "If this passes, AWS Python labs can use the real boto3 SDK against a mocked AWS.",
    packages: ["boto3", "moto[s3]"],
    code: `import boto3
from moto import mock_aws

with mock_aws():
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket="cafe-byte")
    s3.put_object(Bucket="cafe-byte", Key="menu.txt", Body=b"latte 3.50")
    names = [b["Name"] for b in s3.list_buckets()["Buckets"]]
    body = s3.get_object(Bucket="cafe-byte", Key="menu.txt")["Body"].read().decode()
    print("Buckets:", names)
    print("menu.txt:", body)
    assert names == ["cafe-byte"] and body == "latte 3.50"

print("PASSED")
`,
  },
  {
    id: "hcl",
    title: "python-hcl2 (Terraform labs)",
    why: "If this passes, Terraform labs can parse learners' .tf files in the browser.",
    packages: ["python-hcl2"],
    code: `import hcl2

tf = """
resource "aws_s3_bucket" "menu" {
  bucket = "cafe-byte-menu"

  lifecycle {
    prevent_destroy = true
  }
}
"""

config = hcl2.loads(tf)
print(config)
assert "prevent_destroy" in str(config)

print("PASSED")
`,
  },
];
