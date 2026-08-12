/* 用户与角色数据（模拟登录用）
   ⚠ 演示用虚构人员，非真实员工信息 */

window.DB = window.DB || {};

DB.roles = {
  sales:   { id: 'sales',   name: '销售',   desc: '客户开拓、背调与成单推进', color: 'brand',  icon: 'cart'    },
  pre:     { id: 'pre',     name: '售前',   desc: '方案设计、技术交流与论证', color: 'accent', icon: 'compass' },
  manager: { id: 'manager', name: '主管',   desc: '团队管理、目标与过程把控', color: 'purple', icon: 'chart'   },
  admin:   { id: 'admin',   name: '管理员', desc: '平台配置、权限与数据管理', color: 'warn',   icon: 'gear'    }
};

DB.users = [
  {
    id: 'u-sales', name: '李昌任', role: 'sales', title: '高级销售经理', region: '华东大区',
    initials: 'LR', phone: '138****6021', email: 'changren.li@ogcloud.com',
    kpi: { pipe: 18, deals: 3, target: 30 }
  },
  {
    id: 'u-pre', name: '王售前', role: 'pre', title: '资深售前架构师', region: '华东大区',
    initials: 'WS', phone: '139****3380', email: 'shouqian.wang@ogcloud.com',
    kpi: { schemes: 12, pocs: 4, win: 9 }
  },
  {
    id: 'u-mgr', name: '赵主管', role: 'manager', title: '销售团队负责人', region: '华东大区',
    initials: 'ZM', phone: '137****1190', email: 'zhuguan.zhao@ogcloud.com',
    kpi: { teamPipe: 86, members: 9, rate: 0.62 }
  },
  {
    id: 'u-admin', name: '钱管理员', role: 'admin', title: '平台管理员', region: '总部',
    initials: 'QA', phone: '135****7782', email: 'admin.qian@ogcloud.com',
    kpi: { users: 142, roles: 4, audit: '正常' }
  }
];

/* 当前登录态的默认用户（按角色可直接选） */
DB.defaultUserForRole = function (roleId) {
  var u = (DB.users || []).filter(function (x) { return x.role === roleId; })[0];
  return u || DB.users[0];
};
