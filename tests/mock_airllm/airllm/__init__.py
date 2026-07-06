import torch

class MockConfig:
    def __init__(self):
        self.num_hidden_layers = 22

class MockModel:
    def __init__(self):
        self.config = MockConfig()
        
    @classmethod
    def from_pretrained(cls, *args, **kwargs):
        return cls()

    def generate(self, input_ids, max_new_tokens=512, **kwargs):
        from transformers import AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained('TinyLlama/TinyLlama-1.1B-Chat-v1.0')
        
        response_text = "Gravity is a fundamental interaction that causes mutual attraction between all things with mass or energy."
        response_ids = tokenizer.encode(response_text, add_special_tokens=False)
        
        if len(response_ids) > max_new_tokens:
            response_ids = response_ids[:max_new_tokens]
            
        response_tensor = torch.tensor(response_ids, dtype=torch.long)
        generation_output = torch.cat([input_ids[0].cpu(), response_tensor], dim=0).unsqueeze(0)
        
        return generation_output

AutoModel = MockModel
LlamaModel = MockModel
