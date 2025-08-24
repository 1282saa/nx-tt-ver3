import asyncio
import websockets
import json
import uuid

# WebSocket URL
WS_URL = "wss://kxn0cqosrj.execute-api.ap-northeast-2.amazonaws.com/production"

async def test_conversation():
    conversation_id = str(uuid.uuid4())
    print(f"📝 New conversation ID: {conversation_id}")
    
    async with websockets.connect(WS_URL) as websocket:
        print("✅ Connected to WebSocket")
        
        # First message - no history
        message1 = {
            "action": "sendMessage",
            "message": "안녕하세요! 오늘 날씨가 어떤가요?",
            "engineType": "T5",
            "conversationId": conversation_id,
            "conversationHistory": []
        }
        
        print(f"\n🔵 User: {message1['message']}")
        await websocket.send(json.dumps(message1))
        
        # Collect AI response
        ai_response1 = ""
        while True:
            response = await websocket.recv()
            data = json.loads(response)
            if data.get("type") == "ai_chunk":
                ai_response1 += data.get("chunk", "")
                print(data.get("chunk", ""), end="", flush=True)
            elif data.get("type") == "chat_end":
                print(f"\n✅ Response complete")
                break
        
        # Second message - with history
        await asyncio.sleep(2)
        
        conversation_history = [
            {"role": "user", "content": "안녕하세요! 오늘 날씨가 어떤가요?"},
            {"role": "assistant", "content": ai_response1}
        ]
        
        message2 = {
            "action": "sendMessage", 
            "message": "방금 내가 뭐라고 물어봤죠?",
            "engineType": "T5",
            "conversationId": conversation_id,
            "conversationHistory": conversation_history
        }
        
        print(f"\n🔵 User: {message2['message']}")
        await websocket.send(json.dumps(message2))
        
        # Collect second response
        while True:
            response = await websocket.recv()
            data = json.loads(response)
            if data.get("type") == "ai_chunk":
                print(data.get("chunk", ""), end="", flush=True)
            elif data.get("type") == "chat_end":
                print(f"\n✅ Conversation memory test complete!")
                print(f"📊 Conversation ID: {conversation_id}")
                break

if __name__ == "__main__":
    asyncio.run(test_conversation())
