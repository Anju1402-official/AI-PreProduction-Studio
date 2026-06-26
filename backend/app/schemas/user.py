from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from enum import Enum


class PlanType(str, Enum):
    creator = "creator"
    professional = "professional"
    studio = "studio"


class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    # bcrypt only uses the first 72 bytes of a password; max_length here is
    # a generous upper bound just to reject obviously-wrong input (e.g. a
    # pasted file) before it reaches the hashing step, not a security
    # measure in itself.
    password: str = Field(min_length=8, max_length=128)
    plan_type: PlanType = PlanType.creator

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name cannot be blank")
        return stripped


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    plan_type: PlanType


class Token(BaseModel):
    access_token: str
    token_type: str
