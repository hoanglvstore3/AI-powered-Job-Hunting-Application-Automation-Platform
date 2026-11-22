export default function LoginPage() {
  return (
    <div>
      <h1>Đăng nhập</h1>
      <p className="muted">
        Website cá nhân của Lê Việt Hoàng — chỉ chủ sở hữu đăng nhập bằng tài khoản Google được.
        Không có trang đăng ký công khai.
      </p>
      <p><a href="/api/auth/signin/google"><button>Đăng nhập bằng Google</button></a></p>
    </div>
  );
}
