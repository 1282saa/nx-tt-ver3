// 브라우저 콘솔에서 실행할 테스트 코드
// 1. 브라우저에서 http://localhost:3000 열기
// 2. 개발자 도구 콘솔 열기 (F12 또는 Cmd+Opt+I)
// 3. 아래 코드 붙여넣기 및 실행

async function testConversationMemory() {
    console.log("🧪 Starting conversation memory test...");
    
    // WebSocket 서비스 가져오기
    const { sendChatMessage, connectWebSocket } = await import('./src/services/websocketService.js');
    
    // WebSocket 연결
    await connectWebSocket();
    console.log("✅ WebSocket connected");
    
    // 테스트용 대화 ID
    const testConversationId = `test-${Date.now()}`;
    
    // 첫 번째 메시지
    console.log("\n📤 Sending first message...");
    await sendChatMessage(
        "안녕하세요! 저는 테스트 사용자입니다.", 
        "T5",
        [],  // 빈 히스토리
        testConversationId
    );
    
    // 3초 대기
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 두 번째 메시지 (대화 기억 테스트)
    console.log("\n📤 Sending second message to test memory...");
    const history = [
        {role: "user", content: "안녕하세요! 저는 테스트 사용자입니다."},
        {role: "assistant", content: "안녕하세요! 만나서 반갑습니다."}
    ];
    
    await sendChatMessage(
        "제가 누구라고 했죠?",
        "T5", 
        history,
        testConversationId
    );
    
    console.log("\n✅ Test complete! Check the responses to see if AI remembers the conversation.");
    console.log(`📊 Conversation ID: ${testConversationId}`);
}

// 테스트 실행
testConversationMemory().catch(console.error);