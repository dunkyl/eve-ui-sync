use serde::{Deserialize, Serialize};

pub struct ESI {
    url: String,
    client: reqwest::Client,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Toon {
    id: u64,
    name: String,
}


impl ESI {
    pub fn new() -> ESI {
        ESI {
            url: "https://esi.evetech.net/latest/".to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn find_toon(&self, id: u64) -> Toon {
        let url = format!("{}characters/{}/", self.url, id);
        let response = self.client.get(url).send().await.unwrap();
        let json: serde_json::Value = response.json().await.unwrap();
        Toon {
            id: id,
            name: json["name"].as_str().unwrap().to_string(),
        }
    }

    pub async fn find_toon_portrait(&self, id: u64) -> String {
        let url = format!("{}characters/{}/portrait/", self.url, id);
        let response = self.client.get(url).send().await.unwrap();
        let json: serde_json::Value = response.json().await.unwrap();
        json["px128x128"].as_str().unwrap().to_string()
    }
}





