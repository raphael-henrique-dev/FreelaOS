from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

client = TestClient(app)
res = client.options("/", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
print("Status:", res.status_code)
print("Headers:", res.headers)
