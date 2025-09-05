"""
대화(Conversation) 리포지토리
DynamoDB와의 모든 상호작용을 캡슐화
"""
import boto3
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import logging

from ..models import Conversation, Message

logger = logging.getLogger(__name__)


class ConversationRepository:
    """대화 데이터 접근 계층"""
    
    def __init__(self, table_name: str = 'nexus-conversations', region: str = 'us-east-1'):
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)
        logger.info(f"ConversationRepository initialized with table: {table_name}")
    
    def save(self, conversation: Conversation) -> Conversation:
        """대화 저장"""
        try:
            # ID가 없으면 생성
            if not conversation.conversation_id:
                conversation.conversation_id = str(uuid.uuid4())
            
            # 타임스탬프 업데이트
            now = datetime.now().isoformat()
            if not conversation.created_at:
                conversation.created_at = now
            conversation.updated_at = now
            
            # DynamoDB에 저장
            self.table.put_item(Item=conversation.to_dict())
            
            logger.info(f"Conversation saved: {conversation.conversation_id}")
            return conversation
            
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")
            raise
    
    def find_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """ID로 대화 조회"""
        try:
            response = self.table.get_item(
                Key={'conversationId': conversation_id}
            )
            
            if 'Item' in response:
                return Conversation.from_dict(response['Item'])
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding conversation by id: {str(e)}")
            raise
    
    def find_by_user(self, user_id: str, limit: int = 20) -> List[Conversation]:
        """사용자별 대화 목록 조회"""
        try:
            response = self.table.query(
                IndexName='userId-index',
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={
                    ':userId': user_id
                },
                Limit=limit,
                ScanIndexForward=False  # 최신순 정렬
            )
            
            conversations = []
            for item in response.get('Items', []):
                conversations.append(Conversation.from_dict(item))
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error finding conversations by user: {str(e)}")
            raise
    
    def update_messages(self, conversation_id: str, messages: List[Message]) -> bool:
        """대화의 메시지 업데이트"""
        try:
            messages_data = [
                {
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.timestamp or datetime.now().isoformat(),
                    'metadata': msg.metadata
                }
                for msg in messages
            ]
            
            self.table.update_item(
                Key={'conversationId': conversation_id},
                UpdateExpression='SET messages = :messages, updatedAt = :updatedAt',
                ExpressionAttributeValues={
                    ':messages': messages_data,
                    ':updatedAt': datetime.now().isoformat()
                }
            )
            
            logger.info(f"Messages updated for conversation: {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating messages: {str(e)}")
            raise
    
    def update_title(self, conversation_id: str, title: str) -> bool:
        """대화 제목 업데이트"""
        try:
            self.table.update_item(
                Key={'conversationId': conversation_id},
                UpdateExpression='SET title = :title, updatedAt = :updatedAt',
                ExpressionAttributeValues={
                    ':title': title,
                    ':updatedAt': datetime.now().isoformat()
                }
            )
            
            logger.info(f"Title updated for conversation: {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating title: {str(e)}")
            raise
    
    def delete(self, conversation_id: str) -> bool:
        """대화 삭제"""
        try:
            self.table.delete_item(
                Key={'conversationId': conversation_id}
            )
            
            logger.info(f"Conversation deleted: {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            raise
    
    def find_recent(self, user_id: str, engine_type: Optional[str] = None, days: int = 30) -> List[Conversation]:
        """최근 대화 조회"""
        try:
            from datetime import timedelta
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            filter_expression = 'updatedAt > :cutoff'
            expression_values = {
                ':userId': user_id,
                ':cutoff': cutoff_date
            }
            
            if engine_type:
                filter_expression += ' AND engineType = :engineType'
                expression_values[':engineType'] = engine_type
            
            response = self.table.query(
                IndexName='userId-index',
                KeyConditionExpression='userId = :userId',
                FilterExpression=filter_expression,
                ExpressionAttributeValues=expression_values,
                ScanIndexForward=False
            )
            
            conversations = []
            for item in response.get('Items', []):
                conversations.append(Conversation.from_dict(item))
            
            return conversations
            
        except Exception as e:
            logger.error(f"Error finding recent conversations: {str(e)}")
            raise