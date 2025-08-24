import { 
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  GetUserCommand,
  GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider';

class AuthService {
  constructor() {
    this.region = 'us-east-1';
    this.userPoolId = 'us-east-1_ohLOswurY';
    this.clientId = '4m4edj8snokmhqnajhlj41h9n2';
    this.clientSecret = null; // Web client doesn't have secret
    
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.region,
    });

    console.log('🔧 AWS SDK AuthService 초기화 완료');
    console.log('User Pool ID:', this.userPoolId);
    console.log('Client ID:', this.clientId);
    console.log('Region:', this.region);
  }

  // 회원가입
  async signUp(username, password, email, name) {
    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
          {
            Name: 'name',
            Value: name,
          },
        ],
      });

      const response = await this.cognitoClient.send(command);
      console.log('회원가입 성공:', response);

      return {
        success: true,
        needsConfirmation: !response.UserConfirmed,
        userId: response.UserSub,
        message: '이메일로 인증 코드가 발송되었습니다.'
      };
    } catch (error) {
      console.error('회원가입 실패:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  // 이메일 인증 코드 확인
  async confirmSignUp(username, code) {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: code,
      });

      const response = await this.cognitoClient.send(command);
      console.log('이메일 인증 성공:', response);

      return {
        success: true,
        isSignUpComplete: true
      };
    } catch (error) {
      console.error('이메일 인증 실패:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  // 인증 코드 재발송
  async resendConfirmationCode(username) {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: username,
      });

      const response = await this.cognitoClient.send(command);
      console.log('인증 코드 재발송 성공:', response);

      return {
        success: true,
        destination: response.CodeDeliveryDetails?.Destination,
        message: `인증 코드가 재발송되었습니다.`
      };
    } catch (error) {
      console.error('인증 코드 재발송 실패:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  // 로그인
  async signIn(username, password) {
    try {
      console.log('🔐 로그인 시도:', { username, clientId: this.clientId });

      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const response = await this.cognitoClient.send(command);
      console.log('로그인 응답:', response);

      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        return {
          success: false,
          needsNewPassword: true,
          message: '새 비밀번호를 설정해야 합니다.',
          session: response.Session
        };
      }

      if (response.AuthenticationResult) {
        const tokens = response.AuthenticationResult;
        
        // 사용자 정보 가져오기
        const userInfo = await this.getCurrentUserInfo(tokens.AccessToken);
        
        return {
          success: true,
          user: userInfo,
          tokens: {
            idToken: tokens.IdToken,
            accessToken: tokens.AccessToken,
            refreshToken: tokens.RefreshToken
          }
        };
      }

      return {
        success: false,
        error: '로그인에 실패했습니다.'
      };
    } catch (error) {
      console.error('로그인 실패:', error);
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  // 현재 사용자 정보 가져오기
  async getCurrentUserInfo(accessToken) {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken
      });

      const response = await this.cognitoClient.send(command);
      
      const userAttributes = {};
      response.UserAttributes?.forEach(attr => {
        userAttributes[attr.Name] = attr.Value;
      });

      return {
        username: response.Username,
        userId: userAttributes.sub,
        email: userAttributes.email,
        name: userAttributes.name,
        emailVerified: userAttributes.email_verified === 'true'
      };
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      return null;
    }
  }

  // 로그아웃
  async signOut() {
    try {
      const accessToken = localStorage.getItem('authToken');
      
      if (accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: accessToken
        });

        await this.cognitoClient.send(command);
      }

      // 로컬 스토리지 정리
      localStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userRole');
      localStorage.removeItem('selectedEngine');
      
      console.log('로그아웃 성공');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('로그아웃 실패:', error);
      
      // 로컬 스토리지는 정리
      localStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userRole');
      localStorage.removeItem('selectedEngine');
      
      return {
        success: true // 로컬 정리는 성공
      };
    }
  }

  // 현재 사용자 정보 가져오기 (저장된 토큰 사용)
  async getCurrentUser() {
    try {
      const accessToken = localStorage.getItem('authToken');
      if (!accessToken) {
        return null;
      }

      return await this.getCurrentUserInfo(accessToken);
    } catch (error) {
      console.error('현재 사용자 가져오기 실패:', error);
      return null;
    }
  }

  // 세션 정보 가져오기
  async getSession() {
    try {
      const idToken = localStorage.getItem('authToken');
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      
      if (idToken && userInfo) {
        return {
          tokens: {
            idToken: idToken,
            accessToken: idToken, // 같은 토큰 사용
            refreshToken: null
          },
          userSub: userInfo.userId
        };
      }
      
      return null;
    } catch (error) {
      console.error('세션 가져오기 실패:', error);
      return null;
    }
  }

  // 인증 토큰 가져오기 (API 요청용)
  async getAuthToken() {
    try {
      return localStorage.getItem('authToken');
    } catch (error) {
      console.error('인증 토큰 가져오기 실패:', error);
      return null;
    }
  }

  // 사용자 인증 상태 확인
  async isAuthenticated() {
    try {
      const accessToken = localStorage.getItem('authToken');
      if (!accessToken) {
        return false;
      }

      // 토큰의 유효성을 간단히 확인 (실제로는 JWT 파싱 필요)
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
      return false;
    }
  }

  // 에러 메시지 처리
  getErrorMessage(error) {
    const errorCode = error.name || error.code;
    
    switch (errorCode) {
      case 'UsernameExistsException':
        return '이미 존재하는 사용자명입니다.';
      case 'InvalidParameterException':
        return '입력한 정보가 올바르지 않습니다.';
      case 'InvalidPasswordException':
        return '비밀번호는 8자 이상이며, 대소문자, 숫자, 특수문자를 포함해야 합니다.';
      case 'CodeMismatchException':
        return '인증 코드가 올바르지 않습니다.';
      case 'ExpiredCodeException':
        return '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.';
      case 'NotAuthorizedException':
        return '아이디 또는 비밀번호가 올바르지 않습니다.';
      case 'UserNotFoundException':
        return '존재하지 않는 사용자입니다.';
      case 'UserNotConfirmedException':
        return '이메일 인증이 완료되지 않았습니다.';
      default:
        return error.message || '알 수 없는 오류가 발생했습니다.';
    }
  }
}

export default new AuthService();