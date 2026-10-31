import asyncio
import sys
sys.path.append('.')
from app.database import get_session
from app.models import User
from app.security import hash_password, verify_password

async def main():
    async with get_session()() as session:
        from sqlalchemy import select
        # check both emails
        for email in ['suporte@fundacaodrmoises.com.br', 'admin@savepage.com']:
            res = await session.execute(select(User).where(User.email == email))
            user = res.scalar_one_or_none()
            if user:
                print(f'Found user: {user.email}')
                print(f'  Role: {user.role.value if hasattr(user.role, "value") else user.role}')
                print(f'  Hash starts with: {user.hashed_password[:30]}...')
                # Test password 'admin123'
                if verify_password('admin123', user.hashed_password):
                    print('  Password "admin123" CORRECT!')
                else:
                    print('  Password "admin123" INCORRECT')
                    # Update hash
                    user.hashed_password = hash_password('admin123')
                    session.add(user)
                    await session.commit()
                    print('  Updated password to admin123')
            else:
                print(f'User {email} NOT FOUND')

if __name__ == '__main__':
    asyncio.run(main())
