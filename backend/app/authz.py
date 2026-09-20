"""受控账号与只读观察模式的服务端强制校验。

前端虽然会隐藏入口，但真正的权限边界在这里：任何直接构造的请求
（curl / 脚本 / devtools）都会被拒绝，并返回明确原因。
"""

ACCOUNTS = {
    "trader-01": {"id": "trader-01", "name": "交易员 · 李明", "role": "trader"},
    "viewer-01": {"id": "viewer-01", "name": "观察者 · 王芳", "role": "viewer"},
}

# (http_status, 拒绝原因)；None 表示放行
def authorize_mutation(account_id, view_mode, action):
    account = ACCOUNTS.get(account_id or "")
    if account is None:
        return 401, "未知或已失效的账号，请使用受控账号访问。"
    if view_mode == "observe":
        return 403, "当前处于只读观察模式，%s等操作已被禁止；请退出观察模式后再试。" % action
    if account["role"] == "viewer":
        return 403, "账号“%s”为观察者，无权%s，仅可查看实时行情、订单簿与报告。" % (account["name"], action)
    return None


def accounts_view():
    return [{"id": a["id"], "name": a["name"], "role": a["role"]} for a in ACCOUNTS.values()]
