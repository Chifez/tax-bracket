import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { register, login, logout, getMe, forgotPassword, resetPassword } from '@/server/functions/auth'
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '@/server/validators/auth'

export const useUser = () => {
    return useQuery({
        queryKey: ['user'],
        queryFn: () => getMe(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false,
    })
}

export const useRegister = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: RegisterInput | any) => register({ data }),
        onSuccess: (result: { user: any }) => {
            queryClient.setQueryData(['user'], { user: result.user })
        }
    })
}

export const useLogin = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: LoginInput | any) => login({ data }),
        onSuccess: (result: { user: any }) => {
            queryClient.setQueryData(['user'], { user: result.user })
        }
    })
}

export const useLogout = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => logout(),
        onSuccess: () => {
            queryClient.setQueryData(['user'], { user: null })
            queryClient.invalidateQueries({ queryKey: ['user'] })
        }
    })
}

export const useForgotPassword = () => {
    return useMutation({
        mutationFn: (data: ForgotPasswordInput | any) => forgotPassword({ data }),
    })
}

export const useResetPassword = () => {
    return useMutation({
        mutationFn: (data: ResetPasswordInput | any) => resetPassword({ data }),
    })
}
